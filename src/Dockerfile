FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app
COPY pom.xml .
COPY src/ src/
RUN mvn clean package -q -DskipTests

FROM alpine:3.19
COPY --from=builder /app/target/grammar-oracle-parser.jar /app/target/grammar-oracle-parser.jar
CMD ["echo", "Parser JAR built successfully"]
