"""
ocr_service.py

Reliable OCR for images and PDFs.
- Smart preprocessing that doesn't destroy clean document images
- Native PDF text extraction with OCR fallback
- No arbitrary text truncation
"""

import pytesseract
import cv2
import numpy as np
import platform
import fitz  # PyMuPDF
import re

if platform.system() == "Windows":
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def clean_text(text: str) -> str:
    """
    Clean up messy OCR/PDF extracted text without destroying content.
    """
    text = re.sub(r'[^\x20-\x7E\n\u0900-\u097F\u0C00-\u0C7F]', ' ', text)

    text = re.sub(r'[ \t]+', ' ', text)

    text = re.sub(r'\n{3,}', '\n\n', text)

    lines = [line.strip() for line in text.splitlines()]

    lines = [line for line in lines if len(line) > 2 or line == ""]

    return "\n".join(lines).strip()


def assess_image_quality(gray: np.ndarray) -> dict:
    """
    Assess image quality to decide which preprocessing to apply.
    Returns dict with flags: is_dark, is_blurry, is_low_contrast, needs_deskew
    """
    mean_brightness = float(np.mean(gray))
    # Blurriness via Laplacian variance
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    # Contrast as std deviation
    contrast = float(np.std(gray))

    return {
        "is_dark": mean_brightness < 100,
        "is_blurry": blur_score < 100,
        "is_low_contrast": contrast < 40,
        "mean_brightness": mean_brightness,
        "blur_score": blur_score,
        "contrast": contrast,
    }


def preprocess_image(img_array: np.ndarray) -> np.ndarray:
    """
    Smart preprocessing — applies only what the image actually needs.
    Avoids over-processing clean document scans which destroys text.
    """
    # Convert to grayscale
    if len(img_array.shape) == 3:
        gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
    else:
        gray = img_array.copy()

    quality = assess_image_quality(gray)

    h, w = gray.shape
    if w < 1000:
        scale = 1800 / w
        gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    if quality["is_blurry"] or quality["blur_score"] < 50:
        gray = cv2.GaussianBlur(gray, (3, 3), 0)

    if quality["is_low_contrast"] or quality["is_dark"]:
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)

    
    mean_val = float(np.mean(gray))

    if mean_val > 180:
        _, result = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    elif mean_val > 120:
        result = cv2.adaptiveThreshold(
            gray, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            51, 12  # large block size = smoother, fewer broken letters
        )
    else:
        # Dark image — invert first, then Otsu
        inverted = cv2.bitwise_not(gray)
        _, result = cv2.threshold(inverted, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    return result


def ocr_image_array(img: np.ndarray) -> str:
    """
    Run Tesseract on an image array with multiple PSM strategies,
    return the best result.
    """
    processed = preprocess_image(img)

    results = []

    # PSM 6: uniform block of text — best for homework/assignments/notes
    text6 = pytesseract.image_to_string(processed, config=r'--oem 3 --psm 6')
    results.append(text6.strip())

    # PSM 3: fully automatic layout — best for mixed content (tables, headers)
    text3 = pytesseract.image_to_string(processed, config=r'--oem 3 --psm 3')
    results.append(text3.strip())

    # PSM 4: assume single column — good for formatted documents
    text4 = pytesseract.image_to_string(processed, config=r'--oem 3 --psm 4')
    results.append(text4.strip())

    # Return the longest (most complete) result
    best = max(results, key=lambda t: len(t))

    return clean_text(best)


def extract_text_from_image_bytes(image_bytes: bytes) -> str:
    """Extract text from image bytes using OpenCV + Tesseract."""

    np_arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Could not decode image. Make sure it's a valid JPG, PNG, or BMP file.")

    text = ocr_image_array(img)

    if not text or len(text) < 10:
        raise ValueError("Could not extract text from image. Please ensure the image is clear and contains readable text.")

    return text


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """
    Extract text from PDF:
    - Uses native PyMuPDF text extraction (fast, accurate for digital PDFs)
    - Falls back to OCR page-by-page for scanned/image-based PDFs
    - No arbitrary character limit — returns full document
    """
    all_text = []

    pdf_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    total_pages = len(pdf_doc)

    for page_num in range(total_pages):
        page = pdf_doc[page_num]

        # ✅ Try native text extraction first
        native_text = page.get_text("text").strip()
        native_text = clean_text(native_text)

        if len(native_text) > 50:
            # Good native text — use it directly
            all_text.append(f"[Page {page_num + 1}]\n{native_text}")
        else:
            # Scanned/image page — OCR at high DPI
            pix = page.get_pixmap(dpi=300)
            img_bytes = pix.tobytes("png")

            np_arr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if img is not None:
                ocr_text = ocr_image_array(img)
                if ocr_text:
                    all_text.append(f"[Page {page_num + 1}]\n{ocr_text}")

    pdf_doc.close()

    if not all_text:
        return ""

    return "\n\n".join(all_text)


async def extract_text(file) -> str:
    """
    Main entry point — accepts FastAPI UploadFile.
    Supports: .jpg, .jpeg, .png, .bmp, .tiff, .webp, .pdf
    """
    await file.seek(0)
    file_bytes = await file.read()

    if not file_bytes:
        raise ValueError("Uploaded file is empty.")

    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()

    if filename.endswith(".pdf") or content_type == "application/pdf":
        return extract_text_from_pdf_bytes(file_bytes)

    elif any(filename.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"]) \
         or content_type.startswith("image/"):
        return extract_text_from_image_bytes(file_bytes)

    else:
        # Last resort — try image decode
        try:
            return extract_text_from_image_bytes(file_bytes)
        except Exception:
            raise ValueError(
                f"Unsupported file type: '{file.filename}'. Please upload JPG, PNG, BMP, WEBP, or PDF."
            )