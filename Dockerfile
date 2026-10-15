FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build -- --base=/static/

FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_DEBUG=False \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential default-libmysqlclient-dev pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/config/ ./backend/config/
RUN mkdir -p backend/config/static backend/config/templates
COPY --from=frontend-build /app/frontend/dist/ ./backend/config/static/
COPY --from=frontend-build /app/frontend/dist/index.html ./backend/config/templates/index.html
RUN DJANGO_SECRET_KEY=build-only-not-for-runtime python backend/config/manage.py collectstatic --noinput

CMD ["sh", "-c", "exec gunicorn --chdir backend/config config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers ${WEB_CONCURRENCY:-2} --access-logfile - --error-logfile -"]