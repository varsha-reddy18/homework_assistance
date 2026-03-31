import logging
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

logger = logging.getLogger(__name__)

device = "cuda" if torch.cuda.is_available() else "cpu"

grammar_tokenizer = None
grammar_model     = None
MODEL_NAME        = "vennify/t5-base-grammar-correction"
MAX_INPUT_CHARS   = 512          
MAX_NEW_TOKENS    = 128          
NUM_BEAMS         = 4


def load_grammar_model() -> None:
    """Load tokeniser and model into memory the first time they are needed."""
    global grammar_tokenizer, grammar_model

    if grammar_tokenizer is not None and grammar_model is not None:
        return  # already loaded

    try:
        logger.info("Loading grammar model '%s' on %s …", MODEL_NAME, device)
        grammar_tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        grammar_model = (
            AutoModelForSeq2SeqLM
            .from_pretrained(MODEL_NAME, low_cpu_mem_usage=True)
            .to(device)
        )
        grammar_model.eval()
        logger.info("Grammar model loaded successfully.")
    except Exception as exc:
        # Reset so the next call tries again instead of using a half-loaded state
        grammar_tokenizer = None
        grammar_model     = None
        logger.error("Failed to load grammar model: %s", exc)
        raise RuntimeError(f"Grammar model could not be loaded: {exc}") from exc

def grammar_check(text: str) -> str:
    """
    Return a grammar-corrected version of *text*.

    Falls back to the original text when:
      • the input is empty / whitespace-only
      • the model fails to load
      • inference raises an unexpected error
      • the model returns an empty string
    """
   
    if not text or not text.strip():
        return text or ""

    original = text.strip()

    # Silently truncate extremely long inputs rather than crashing
    if len(original) > MAX_INPUT_CHARS:
        logger.warning(
            "Input truncated from %d to %d characters.", len(original), MAX_INPUT_CHARS
        )
        original = original[:MAX_INPUT_CHARS]

    try:
        load_grammar_model()
    except RuntimeError as exc:
        logger.error("Skipping grammar check — model unavailable: %s", exc)
        return original
    try:
        prompt = "grammar: " + original

        inputs = grammar_tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=256,      # hard token cap for the encoder
            padding=True,
        ).to(device)

        with torch.no_grad():
            outputs = grammar_model.generate(
                **inputs,
                max_new_tokens=MAX_NEW_TOKENS,
                num_beams=NUM_BEAMS,
                early_stopping=True,
                no_repeat_ngram_size=3,   # avoids repetitive output
            )

        result = grammar_tokenizer.decode(
            outputs[0], skip_special_tokens=True
        ).strip()

        if not result:
            logger.warning("Model returned empty string; returning original.")
            return original

        if len(result) < max(3, len(original) * 0.2):
            logger.warning(
                "Result '%s' looks truncated; returning original.", result
            )
            return original

        return result

    except torch.cuda.OutOfMemoryError:
        # Free VRAM and fall back gracefully
        torch.cuda.empty_cache()
        logger.error("CUDA OOM during grammar check; returning original.")
        return original

    except Exception as exc:
        logger.error("Unexpected error during grammar check: %s", exc, exc_info=True)
        return original


def unload_grammar_model() -> None:
    """Release model weights and free GPU/CPU memory."""
    global grammar_tokenizer, grammar_model
    grammar_model     = None
    grammar_tokenizer = None
    if device == "cuda":
        torch.cuda.empty_cache()
    logger.info("Grammar model unloaded.")