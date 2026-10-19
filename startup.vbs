' ================================================================
' LinkedIn AI Studio Backend - Background Startup Script
' ================================================================
' This script launches the backend silently in the background (no black CMD window).
' Can be executed directly or triggered automatically on Windows logon.

Option Explicit

Dim FSO, WshShell, ScriptDir, TargetBat, ProjectDir

Set FSO = CreateObject("Scripting.FileSystemObject")
ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)

' 1. Check if start_backend.bat is in the same folder as this script
TargetBat = ScriptDir & "\start_backend.bat"

' 2. If copied into Windows Startup folder, fall back to known project directory
If Not FSO.FileExists(TargetBat) Then
    TargetBat = "a:\Project Folder\Linkedin Bot\start_backend.bat"
End If

' 3. Execute silently in the background
If FSO.FileExists(TargetBat) Then
    ProjectDir = FSO.GetParentFolderName(TargetBat)
    Set WshShell = CreateObject("WScript.Shell")
    WshShell.CurrentDirectory = ProjectDir
    ' WindowStyle 0 = Hidden window, bWaitOnReturn = False (runs asynchronously)
    WshShell.Run Chr(34) & TargetBat & Chr(34) & " --startup --silent", 0, False
    Set WshShell = Nothing
Else
    MsgBox "LinkedIn AI Studio Startup Error:" & vbCrLf & vbCrLf & _
           "Could not locate start_backend.bat at:" & vbCrLf & _
           "1. " & ScriptDir & "\start_backend.bat" & vbCrLf & _
           "2. a:\Project Folder\Linkedin Bot\start_backend.bat", _
           16, "LinkedIn AI Studio"
End If

Set FSO = Nothing
