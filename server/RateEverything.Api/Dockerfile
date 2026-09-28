# syntax=docker/dockerfile:1

# ---------- Build ----------
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY RateEverything.Api.csproj .
RUN dotnet restore RateEverything.Api.csproj

COPY . .
RUN dotnet publish RateEverything.Api.csproj -c Release -o /app --no-restore

# ---------- Runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app .

# Render sets PORT at runtime; Program.cs reads it and binds to 0.0.0.0.
# ASPNETCORE_ENVIRONMENT stays Production by default in this image.
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "RateEverything.Api.dll"]
