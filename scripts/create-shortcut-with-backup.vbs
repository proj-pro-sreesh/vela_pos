' Create Desktop Shortcut for Vela POS with Auto Backup
Set WshShell = CreateObject("WScript.Shell")
Set shortcut = WshShell.CreateShortcut(WshShell.SpecialFolders("Desktop") & "\Vela POS with Backup.lnk")

' Set the shortcut properties
shortcut.TargetPath = WshShell.CurrentDirectory & "\scripts\start-and-backup.bat"
shortcut.WorkingDirectory = WshShell.CurrentDirectory
shortcut.Description = "Vela POS Restaurant Management System - With Auto Backup"
shortcut.WindowStyle = 1 ' Normal window

' Save the shortcut
shortcut.Save

MsgBox "Desktop shortcut with auto backup created successfully!" & vbCrLf & vbCrLf & "This version will backup your database on every startup.", vbInformation, "Vela POS"
