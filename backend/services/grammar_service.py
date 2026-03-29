
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch

device = "cuda" if torch.cuda.is_available() else "cpu"

grammar_tokenizer = None
grammar_model = None

def load_grammar_model():
    global grammar_tokenizer, grammar_model
    if grammar_tokenizer is None or grammar_model is None:
        grammar_tokenizer = AutoTokenizer.from_pretrained("vennify/t5-base-grammar-correction")
        grammar_model = AutoModelForSeq2SeqLM.from_pretrained(
            "vennify/t5-base-grammar-correction",
            low_cpu_mem_usage=True
        ).to(device)
        grammar_model.eval()
def grammar_check(text: str):
    load_grammar_model()

    prompt = "grammar: " + text.strip()

    inputs = grammar_tokenizer(
        prompt,
        return_tensors="pt",
        truncation=True,
        padding=True
    ).to(device)

    with torch.no_grad():
        outputs = grammar_model.generate(
            **inputs,
            max_new_tokens=64,
            num_beams=4,
            early_stopping=True
        )

    result = grammar_tokenizer.decode(outputs[0], skip_special_tokens=True).strip()

    if not result:
        return text.strip()

    return result