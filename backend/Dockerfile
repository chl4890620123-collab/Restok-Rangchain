FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY gradlew gradlew
COPY gradle gradle
COPY build.gradle settings.gradle ./
RUN chmod +x ./gradlew
COPY src src
RUN ./gradlew clean bootJar -x test --no-daemon

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S restok && adduser -S restok -G restok \
    && mkdir -p /app/data/uploads \
    && chown -R restok:restok /app
COPY --from=build /app/build/libs/*.jar app.jar
USER restok
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
