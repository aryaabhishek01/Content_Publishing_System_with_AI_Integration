@echo off
echo ============================================================
echo   ContentHub - Starting All Services
echo ============================================================
echo.

set "MVN_CMD=mvn"
where mvn >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    if exist "%USERPROFILE%\.m2\wrapper\dists\apache-maven-3.9.14\ed7edd442f634ac1c1ef5ba2b61b6d690b5221091f1a8e1123f5fadcc967520d\bin\mvn.cmd" (
        set "MVN_CMD=%USERPROFILE%\.m2\wrapper\dists\apache-maven-3.9.14\ed7edd442f634ac1c1ef5ba2b61b6d690b5221091f1a8e1123f5fadcc967520d\bin\mvn.cmd"
    )
)

echo [1/10] Starting API Gateway (port 8080)...
start "API Gateway" cmd /k "cd api-gateway && "%MVN_CMD%" spring-boot:run"
timeout /t 3 /nobreak >nul

echo [2/10] Starting User Service (port 8081)...
start "User Service" cmd /k "cd user-service && "%MVN_CMD%" spring-boot:run"
timeout /t 2 /nobreak >nul

echo [3/10] Starting OTP Service (port 8089)...
start "OTP Service" cmd /k "cd otp-service && "%MVN_CMD%" spring-boot:run"
timeout /t 2 /nobreak >nul

echo [4/10] Starting Follow Service (port 8083)...
start "Follow Service" cmd /k "cd follow-service && "%MVN_CMD%" spring-boot:run"
timeout /t 2 /nobreak >nul

echo [5/10] Starting Message Service (port 8084)...
start "Message Service" cmd /k "cd message-service && "%MVN_CMD%" spring-boot:run"
timeout /t 2 /nobreak >nul

echo [6/10] Starting Notification Service (port 8085)...
start "Notification Service" cmd /k "cd notification-service && "%MVN_CMD%" spring-boot:run"
timeout /t 2 /nobreak >nul

echo [7/10] Starting Admin Service (port 8086)...
start "Admin Service" cmd /k "cd admin-service && "%MVN_CMD%" spring-boot:run"
timeout /t 2 /nobreak >nul

echo [8/10] Starting Feedback Service (port 8087)...
start "Feedback Service" cmd /k "cd feedback-service && "%MVN_CMD%" spring-boot:run"
timeout /t 2 /nobreak >nul

echo [9/10] Starting AI Agent Service (port 8088)...
start "AI Agent Service" cmd /k "cd ai-agent-service && "%MVN_CMD%" spring-boot:run"
timeout /t 2 /nobreak >nul

echo [10/10] Starting Post Service (port 8082)...
start "Post Service" cmd /k "cd post-service && "%MVN_CMD%" spring-boot:run"
timeout /t 5 /nobreak >nul

echo.
echo [FRONTEND] Starting React Frontend (port 5173)...
start "Frontend" cmd /c "cd frontend && npm run dev"

echo.
echo ============================================================
echo   All services starting! Please wait ~30 seconds...
echo.
echo   Frontend:    http://localhost:5173
echo   API Gateway: http://localhost:8080
echo.
echo   Default Admin: admin@gmail.com / Admin@123
echo ============================================================
pause
