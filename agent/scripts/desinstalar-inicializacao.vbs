' Remove a inicializacao automatica do OObservador e encerra o processo
' se estiver rodando. Nao desinstala nada mais - so desfaz o que
' instalar-inicializacao.vbs fez.

Dim fso, shell, startupFolder, shortcutPath

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

startupFolder = shell.SpecialFolders("Startup")
shortcutPath = startupFolder & "\OObservador.lnk"

If fso.FileExists(shortcutPath) Then
    fso.DeleteFile shortcutPath
End If

On Error Resume Next
shell.Run "taskkill /F /IM oobservador-agent.exe", 0, True
On Error Goto 0

MsgBox "OObservador removido da inicializacao automatica e encerrado.", 64, "OObservador"
