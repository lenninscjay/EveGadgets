FROM maven:3.9.9-eclipse-temurin-8 AS build
WORKDIR /build
COPY . .
RUN mvn -B clean verify
FROM eclipse-temurin:8-jre
WORKDIR /app
COPY --from=build /build/webapp/target/webapp-1.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
