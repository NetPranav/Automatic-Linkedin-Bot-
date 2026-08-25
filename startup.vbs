Set FSO = CreateObject("Scripting.FileSystemObject")
ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)

Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & ScriptDir & "\start_backend.bat" & chr(34) & " --startup --silent", 0
Set WshShell = Nothing
Set FSO = Nothing
