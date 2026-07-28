# The api is Python standard library only — no dependencies to install.
FROM python:3.12-slim

# Unbuffered stdout so logs (warmup progress, errors) show up immediately.
ENV PYTHONUNBUFFERED=1
WORKDIR /app
COPY app.py .
COPY warmup.jpg .
COPY workflows ./workflows

EXPOSE 8000
CMD ["python", "app.py"]
