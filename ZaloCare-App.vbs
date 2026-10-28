' Zalo Care Bot - Desktop Application Launcher
Option Explicit
Dim WshShell, fso, appDir, http, isRunning
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = appDir

' 1. Check if server is already listening on port 3088
isRunning = False
On Error Resume Next
Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
http.setTimeouts 800, 800, 800, 800
http.Open "GET", "http://localhost:3088/api/zalo/qr-status", False
http.Send
If Err.Number = 0 And http.Status = 200 Then
  isRunning = True
End If
On Error GoTo 0

' 2. If not running, start Node server silently in background (WindowStyle = 0)
If Not isRunning Then
  WshShell.Run "cmd.exe /c node """ & appDir & "\server.js""", 0, False
  WScript.Sleep 2000
End If

' 3. Start Animated Desktop Mascot (if built)
If fso.FileExists(appDir & "\ZaloCareMascot.exe") Then
  WshShell.Run """" & appDir & "\ZaloCareMascot.exe""", 1, False
End If

' 4. Open in Standalone Desktop App Mode (Edge or Chrome App Window without address bar)
On Error Resume Next
Err.Clear
WshShell.Run "msedge.exe --app=http://localhost:3088 --window-size=1400,880", 1, False
If Err.Number <> 0 Then
  Err.Clear
  WshShell.Run "chrome.exe --app=http://localhost:3088 --window-size=1400,880", 1, False
  If Err.Number <> 0 Then
    WshShell.Run "http://localhost:3088", 1, False
  End If
End If
On Error GoTo 0
