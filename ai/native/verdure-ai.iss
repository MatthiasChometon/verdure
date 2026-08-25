; Installeur "verdure IA" — bootstrapper, runtime ComfyUI/Python MUTUALISE.
; Installe le runtime partage (python + ComfyUI + modeles) dans
; %USERPROFILE%\AI\ComfyUI_windows_portable, pour que d'autres IA (verdure, menu...)
; reutilisent le meme dossier. Si le runtime est deja present, ne re-telecharge pas.
; Compiler avec ISCC.exe.

#define MyAppName "verdure IA"
#define MyAppVersion "1.0"
#define PayloadUrl "https://verdureee.duckdns.org/dl/verdure-ai.zip"

[Setup]
AppId={{7F3C9A21-0E4B-4C2A-9D6E-VERDUREAI001}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher=verdure
; Emplacement partage sous le dossier AI de l'utilisateur (sans admin).
DefaultDirName={%USERPROFILE}\AI\ComfyUI_windows_portable
DisableProgramGroupPage=yes
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
; Uniquement si le runtime n'est pas deja la (mutualisation).
Filename: "{sys}\tar.exe"; Parameters: "-xf ""{tmp}\verdure-ai.zip"" --strip-components=1 -C ""{app}"""; StatusMsg: "Installation du runtime IA (~6 Go, patientez)..."; Flags: runhidden waituntilterminated; Check: NeedPayload
; Dependances du launcher (icone barre des taches). Rapide, sans risque a rejouer.
Filename: "{app}\python\python.exe"; Parameters: "-m pip install --disable-pip-version-check --no-warn-script-location pystray Pillow"; StatusMsg: "Finalisation..."; Flags: runhidden waituntilterminated
; Proposer de lancer tout de suite.
Filename: "{app}\python\pythonw.exe"; Parameters: """{app}\tray.py"""; WorkingDir: "{app}"; Description: "Lancer verdure IA maintenant"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; On ne retire QUE les fichiers propres a verdure : le runtime partage (python,
; ComfyUI, modeles) peut servir a d'autres IA, on le laisse.
Type: files; Name: "{app}\tray.py"
Type: files; Name: "{app}\verdure.ico"

[Code]
var
  DownloadPage: TDownloadWizardPage;
  RuntimePresent: Boolean;

// Le runtime est considere present si ComfyUI est deja installe a cet endroit.
function NeedPayload: Boolean;
begin
  Result := not RuntimePresent;
end;

procedure InitializeWizard;
begin
  DownloadPage := CreateDownloadPage(
    'Telechargement du runtime IA',
    'Recuperation de ComfyUI + Python + modeles (~6 Go, une seule fois, mutualise avec les autres IA).',
    nil);
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  if CurPageID = wpReady then
  begin
    RuntimePresent := FileExists(ExpandConstant('{app}\ComfyUI\main.py'))
      and DirExists(ExpandConstant('{app}\python'));
    if not RuntimePresent then
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
    begin
      Log('Runtime deja present : re-telechargement saute (mutualisation).');
      Result := True;
    end;
  end
  else
    Result := True;
end;
