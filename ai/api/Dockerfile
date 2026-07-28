# The api is Python standard library only — no dependencies to install.
FROM python:3.12-slim

WORKDIR /app
COPY app.py .
COPY workflows ./workflows

EXPOSE 8000
CMD ["python", "app.py"]
