FROM python:3.10

RUN useradd -m -u 1000 user
USER user

ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

COPY --chown=user backend/requirements.txt ./backend/requirements.txt

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r ./backend/requirements.txt

COPY --chown=user . /app

WORKDIR /app/backend

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]