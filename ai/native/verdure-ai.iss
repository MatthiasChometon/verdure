; Installeur "verdure IA" — bootstrapper.
; Petit .exe : telecharge verdure-ai.zip (deja heberge sur o2switch), l'extrait a
; plat dans %LOCALAPPDATA%\verdure-ai (sans admin), installe le launcher tray et
; ses dependances, cree les raccourcis. Compiler avec ISCC.exe.

#define MyAppName "verdure IA"
#define MyAppVersion "1.0"
#define PayloadUrl "https://verdureee.duckdns.org/dl/verdure-ai.zip"

[Setup]
AppId={{7F3C9A21-0E4B-4C2A-9D6E-VERDUREAI001}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher=verdure
DefaultDirName={localappdata}\verdure-ai
DisableProgramGroupPage=yes
DisableDirPage=yes
PrivilegesRequired=lowest
OutputDir=.
OutputBaseFilename=verdure-ai-installeur
SetupIconFile=verdure.ico
UninstallDisplayIcon={app}\verdure.ico
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "fr"; MessagesFile: "compiler:Languages\French.isl"

[Tasks]
Name: "desktopicon"; Description: "Creer aussi un raccourci sur le Bureau"; GroupDescription: "Raccourcis :"

[Files]
Source: "tray.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "verdure.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\verdure IA"; Filename: "{app}\python\pythonw.exe"; Parameters: """{app}\tray.py"""; WorkingDir: "{app}"; IconFilename: "{app}\verdure.ico"
Name: "{autodesktop}\verdure IA"; Filename: "{app}\python\pythonw.exe"; Parameters: """{app}\tray.py"""; WorkingDir: "{app}"; IconFilename: "{app}\verdure.ico"; Tasks: desktopicon

[Run]
; Extraction a plat (le zip a un dossier verdure-ai/ en tete -> strip 1 niveau).
Filename: "{sys}\tar.exe"; Parameters: "-xf ""{tmp}\verdure-ai.zip"" --strip-components=1 -C ""{app}"""; StatusMsg: "Installation de l'IA (~6 Go, patientez)..."; Flags: runhidden waituntilterminated
; Dependances du launcher (icone barre des taches).
Filename: "{app}\python\python.exe"; Parameters: "-m pip install --disable-pip-version-check --no-warn-script-location pystray Pillow"; StatusMsg: "Finalisation..."; Flags: runhidden waituntilterminated
; Proposer de lancer tout de suite.
Filename: "{app}\python\pythonw.exe"; Parameters: """{app}\tray.py"""; WorkingDir: "{app}"; Description: "Lancer verdure IA maintenant"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Le contenu extrait par tar n'est pas suivi par [Files] : on nettoie tout le dossier.
Type: filesandordirs; Name: "{app}"

[Code]
var
  DownloadPage: TDownloadWizardPage;

procedure InitializeWizard;
begin
  DownloadPage := CreateDownloadPage(
    'Telechargement de l''IA verdure',
    'Recuperation des composants (~6 Go, une seule fois). Cela peut prendre un moment selon votre connexion.',
    nil);
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  if CurPageID = wpReady then
  begin
    DownloadPage.Clear;
    DownloadPage.Add('{#PayloadUrl}', 'verdure-ai.zip', '');
    DownloadPage.Show;
    try
      try
        DownloadPage.Download;
        Result := True;
      except
        if DownloadPage.AbortedByUser then
          Log('Telechargement annule.')
        else
          SuppressibleMsgBox(AddPeriod(GetExceptionMessage), mbCriticalError, MB_OK, IDOK);
        Result := False;
      end;
    finally
      DownloadPage.Hide;
    end;
  end
  else
    Result := True;
end;
