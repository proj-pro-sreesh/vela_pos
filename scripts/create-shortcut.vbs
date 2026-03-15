' Create Desktop Shortcut for Vela POS
Set WshShell = CreateObject("WScript.Shell")
Set shortcut = WshShell.CreateShortcut(WshShell.SpecialFolders("Desktop") & "\Vela POS.lnk")

' Set the shortcut properties
shortcut.TargetPath = WshShell.CurrentDirectory & "\scripts\start-server.bat"
shortcut.WorkingDirectory = WshShell.CurrentDirectory
shortcut.Description = "Vela POS Restaurant Management System"
shortcut.WindowStyle = 1 ' Normal window

' Save the shortcut
shortcut.Save

MsgBox "Desktop shortcut created successfully!" & vbCrLf & vbCrLf & "You can now double-click the shortcut to start Vela POS.", vbInformation, "Vela POS"
