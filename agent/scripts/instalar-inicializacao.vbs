' Instala o OObservador para iniciar automaticamente (oculto) a cada login
' do Windows. Cria um atalho na pasta Startup do usuario atual - nao precisa
' de permissao de administrador. Para desinstalar, rode desinstalar-inicializacao.vbs.

Dim fso, shell, scriptDir, startupFolder, shortcut, exePath, runHiddenPath

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
exePath = scriptDir & "\oobservador-agent.exe"
runHiddenPath = scriptDir & "\run-hidden.vbs"

If Not fso.FileExists(exePath) Then
    MsgBox "oobservador-agent.exe nao encontrado nesta pasta. Coloque este script na mesma pasta do executavel.", 16, "OObservador"
    WScript.Quit 1
End If

startupFolder = shell.SpecialFolders("Startup")

Set shortcut = shell.CreateShortcut(startupFolder & "\OObservador.lnk")
shortcut.TargetPath = "wscript.exe"
shortcut.Arguments = """" & runHiddenPath & """"
shortcut.WorkingDirectory = scriptDir
shortcut.WindowStyle = 7
shortcut.Description = "OObservador Agent"
shortcut.Save

' Inicia imediatamente tambem, sem esperar o proximo login.
shell.Run """" & exePath & """", 0, False

MsgBox "Instalado! O OObservador vai iniciar automaticamente (oculto) a cada login." & vbCrLf & vbCrLf & "Ja esta rodando agora tambem.", 64, "OObservador"
