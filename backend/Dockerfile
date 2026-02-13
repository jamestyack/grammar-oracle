# For local docker-compose use (JAR provided via shared volume)
# For Render deployment, use Dockerfile.render at the repo root

FROM eclipse-temurin:21-jre-alpine AS java-base

FROM python:3.11-slim

# Copy Java runtime from temurin image
COPY --from=java-base /opt/java/openjdk /opt/java/openjdk
ENV JAVA_HOME=/opt/java/openjdk
ENV PATH="${JAVA_HOME}/bin:${PATH}"

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ app/

# Non-root user for security
RUN useradd --create-home --shell /bin/bash appuser
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
