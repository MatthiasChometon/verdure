# The worker agent is Python standard library only — no dependencies.
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1
WORKDIR /app
COPY app.py .
CMD ["python", "app.py"]
