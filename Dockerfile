FROM oven/bun:1.4.2 AS frontend
WORKDIR /app
COPY ./frontend .
RUN bun install --frozen-lockfile
RUN bun run build

FROM golang:1.27.1 AS backend
WORKDIR /app
COPY ./backend .
RUN CGO_ENABLED=0 go build -o server .

FROM alpine:3.24
WORKDIR /app/backend
COPY --from=backend /app/server ./server
COPY --from=frontend /app/dist /app/frontend/dist
CMD ["./server"]
