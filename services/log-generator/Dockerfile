FROM python:3.12-slim
WORKDIR /app
RUN pip install requests
COPY generator*.py /app/
CMD ["python3", "generator_auth.py", "--scenario", "normal", "--rate", "5", "--loop"]
