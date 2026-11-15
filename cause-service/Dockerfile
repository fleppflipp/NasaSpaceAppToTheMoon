FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY firecause ./firecause
COPY rules ./rules
ENV FIRE_CLUSTERS_DIR=/data/fire_clusters \
    CAUSE_CACHE_PATH=/cache/cause_cache.sqlite
EXPOSE 8090
CMD ["uvicorn", "firecause.app:app", "--host", "0.0.0.0", "--port", "8090"]
