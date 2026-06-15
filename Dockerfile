FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM node:20-alpine AS frontend
WORKDIR /src/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/VideoTool.Web/VideoTool.Web.csproj", "src/VideoTool.Web/"]
COPY ["src/VideoTool.Data/VideoTool.Data.csproj", "src/VideoTool.Data/"]
COPY ["src/VideoTool.Domain/VideoTool.Domain.csproj", "src/VideoTool.Domain/"]
RUN dotnet restore "src/VideoTool.Web/VideoTool.Web.csproj"
COPY --from=frontend /src/src/VideoTool.Web/wwwroot ./src/VideoTool.Web/wwwroot
COPY src/ ./src/
WORKDIR "/src/src/VideoTool.Web"
RUN dotnet publish "VideoTool.Web.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "VideoTool.Web.dll"]
