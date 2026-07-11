' Instala o OObservador para iniciar automaticamente (oculto) a cada login
' do Windows. Cria um atalho na pasta Startup do usuario atual - nao precisa
' de permissao de administrador. Para desinstalar, rode DESINSTALAR.vbs.

Dim fso, shell, scriptDir, binDir, startupFolder, shortcut, exePath, runHiddenPath

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
binDir = scriptDir & "\bin"
exePath = binDir & "\oobservador-agent.exe"
runHiddenPath = binDir & "\run-hidden.vbs"

If Not fso.FileExists(exePath) Then
    MsgBox "oobservador-agent.exe nao encontrado em " & binDir & ". Mantenha a estrutura de pastas original.", 16, "OObservador"
    WScript.Quit 1
End If

' Remove a marca "veio da internet" (Mark of the Web) dos arquivos, senao
' o Windows pede confirmacao toda vez que tenta rodar isso sozinho no login
' - o que trava a inicializacao automatica exatamente no que nao pode
' travar. Precisa disso porque os arquivos chegaram aqui via download/
' zip/e-mail/nuvem.
shell.Run "powershell -NoProfile -WindowStyle Hidden -Command ""Get-ChildItem -LiteralPath '" & scriptDir & "' -Recurse -File | Unblock-File""", 0, True

startupFolder = shell.SpecialFolders("Startup")

Set shortcut = shell.CreateShortcut(startupFolder & "\OObservador.lnk")
shortcut.TargetPath = "wscript.exe"
shortcut.Arguments = """" & runHiddenPath & """"
shortcut.WorkingDirectory = binDir
shortcut.WindowStyle = 7
shortcut.Description = "OObservador Agent"
shortcut.Save

' Inicia imediatamente tambem, sem esperar o proximo login.
shell.Run """" & exePath & """", 0, False

MsgBox "Instalado! O OObservador vai iniciar automaticamente (oculto) a cada login." & vbCrLf & vbCrLf & "Ja esta rodando agora tambem.", 64, "OObservador"
