' Roda o oobservador-agent.exe sem abrir janela de console.
' Precisa estar na mesma pasta do .exe (e do .env).

Dim fso, shell, scriptDir, exePath

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
exePath = scriptDir & "\oobservador-agent.exe"

If Not fso.FileExists(exePath) Then
    MsgBox "oobservador-agent.exe nao encontrado nesta pasta.", 16, "OObservador"
    WScript.Quit 1
End If

shell.Run """" & exePath & """", 0, False
