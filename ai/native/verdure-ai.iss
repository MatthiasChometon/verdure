; Installeur "verdure IA" — ADDITIF / MUTUALISE.
; - Si une ComfyUI existe deja a l'emplacement cible : mode FUSION. On telecharge
;   seulement les pieces verdure (noeud QwenVL + modeles + api/worker/tray), on les
;   ajoute SANS RIEN ECRASER (tar -k), et on installe les deps dans le python de
;   l'utilisateur (python/ ou python_embeded/).
; - Sinon : on installe le runtime complet isole.
; Compiler avec ISCC.exe.

#define MyAppName "verdure IA"
#define MyAppVersion "1.5"
#define FullUrl "https://verdureee.duckdns.org/dl/verdure-ai.zip"
#define PartsUrl "https://verdureee.duckdns.org/dl/verdure-parts.zip"
#define LlamaWheel "https://github.com/JamePeng/llama-cpp-python/releases/download/v0.3.47-cu124-win-20260815/llama_cpp_python-0.3.47%2Bcu124-cp312-cp312-win_amd64.whl"

[Setup]
AppId={{7F3C9A21-0E4B-4C2A-9D6E-VERDUREAI001}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher=verdure
DefaultDirName={%USERPROFILE}\AI\ComfyUI_windows_portable
PrivilegesRequired=lowest
OutputDir=.
OutputBaseFilename=verdure ia
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
Source: "verdure.png"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\verdure IA"; Filename: "{code:PywExe}"; Parameters: """{app}\tray.py"""; WorkingDir: "{app}"; IconFilename: "{app}\verdure.ico"
Name: "{autodesktop}\verdure IA"; Filename: "{code:PywExe}"; Parameters: """{app}\tray.py"""; WorkingDir: "{app}"; IconFilename: "{app}\verdure.ico"; Tasks: desktopicon

[Run]
; FUSION : ajoute les pieces verdure sans jamais ecraser (tar -k).
Filename: "{sys}\tar.exe"; Parameters: "-xkf ""{tmp}\verdure-parts.zip"" -C ""{app}"""; StatusMsg: "Ajout des pieces verdure (ta ComfyUI n'est pas touchee)..."; Flags: runhidden waituntilterminated; Check: IsAdditive
; NEUF : runtime complet isole (extraction a plat).
Filename: "{sys}\tar.exe"; Parameters: "-xf ""{tmp}\verdure-ai.zip"" --strip-components=1 -C ""{app}"""; StatusMsg: "Installation du runtime IA (~6 Go)..."; Flags: runhidden waituntilterminated; Check: IsFresh
; Deps CRITIQUES du launcher (icone barre des taches) — separees pour toujours
; reussir, quelle que soit la version de python.
Filename: "{code:PyExe}"; Parameters: "-m pip install --disable-pip-version-check --no-warn-script-location pystray Pillow einops"; StatusMsg: "Installation du launcher..."; Flags: runhidden waituntilterminated
; Deps d'identification (best-effort). transformers a des wheels pour toute
; version ; le wheel llama-cpp est cp312 et echoue sur un autre python (dans ce
; cas le llama_cpp deja present de ta ComfyUI sert). Un echec ici n'empeche pas
; l'app de se lancer.
Filename: "{code:PyExe}"; Parameters: "-m pip install --disable-pip-version-check --no-warn-script-location transformers"; StatusMsg: "Installation des dependances IA..."; Flags: runhidden waituntilterminated
Filename: "{code:PyExe}"; Parameters: "-m pip install --disable-pip-version-check --no-warn-script-location {#LlamaWheel}"; StatusMsg: "Installation du moteur d'identification..."; Flags: runhidden waituntilterminated
; Lancer.
Filename: "{code:PywExe}"; Parameters: """{app}\tray.py"""; WorkingDir: "{app}"; Description: "Lancer verdure IA maintenant"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; On ne retire QUE les pieces verdure : la ComfyUI et le python de l'utilisateur
; (mode fusion) sont conserves.
Type: filesandordirs; Name: "{app}\ComfyUI\custom_nodes\ComfyUI-QwenVL"
Type: filesandordirs; Name: "{app}\ComfyUI\models\llm\GGUF\Qwen"
Type: filesandordirs; Name: "{app}\api"
Type: filesandordirs; Name: "{app}\worker"
Type: files; Name: "{app}\tray.py"
Type: files; Name: "{app}\verdure.ico"
Type: files; Name: "{app}\verdure.png"
Type: files; Name: "{app}\worker-token"

[Code]
var
  DownloadPage: TDownloadWizardPage;
  Additive: Boolean;

function IsAdditive: Boolean;
begin
  Result := Additive;
end;

function IsFresh: Boolean;
begin
  Result := not Additive;
end;

// Repertoire du python a utiliser sous {app} : 'python' (le notre) ou
// 'python_embeded' (ComfyUI officiel de l'utilisateur).
function PyRel: String;
begin
  if FileExists(ExpandConstant('{app}\python_embeded\python.exe'))
     and not FileExists(ExpandConstant('{app}\python\python.exe')) then
    Result := 'python_embeded'
  else
    Result := 'python';
end;

function PyExe(Param: String): String;
begin
  Result := ExpandConstant('{app}\') + PyRel + '\python.exe';
end;

function PywExe(Param: String): String;
begin
  Result := ExpandConstant('{app}\') + PyRel + '\pythonw.exe';
end;

procedure InitializeWizard;
begin
  DownloadPage := CreateDownloadPage(
    'Telechargement',
    'Recuperation des composants. Cela peut prendre un moment selon votre connexion.',
    nil);
end;

// On note dans le registre si l'install a ete une FUSION (ComfyUI preexistante,
// qui appartient a l'utilisateur) ou NEUVE (ComfyUI posee par verdure). Le
// desinstallateur s'en sert pour adapter son avertissement.
procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    if Additive then
      RegWriteStringValue(HKCU, 'Software\verdure IA', 'InstallMode', 'fusion')
    else
      RegWriteStringValue(HKCU, 'Software\verdure IA', 'InstallMode', 'fresh');
  end;
end;

// Desinstallation : on retire toujours les pieces verdure ([UninstallDelete]).
// En plus, on PROPOSE de retirer aussi ComfyUI + le python — refuse par defaut
// (bouton No par defaut = "case decochee").
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  Mode, Msg, AppDir: String;
begin
  if CurUninstallStep = usUninstall then
  begin
    AppDir := ExpandConstant('{app}');
    if not RegQueryStringValue(HKCU, 'Software\verdure IA', 'InstallMode', Mode) then
      Mode := 'fresh';
    if Mode = 'fusion' then
      Msg := 'Retirer AUSSI ComfyUI et son python ?' + #13#10#13#10
        + 'ATTENTION : cette ComfyUI existait AVANT verdure IA (install en fusion).'
        + ' La supprimer effacera ta ComfyUI et TOUS ses modeles.' + #13#10#13#10
        + 'Reponds NON (defaut) pour ne retirer que verdure IA.'
    else
      Msg := 'Retirer AUSSI ComfyUI et son python ?' + #13#10#13#10
        + 'verdure IA a installe cette ComfyUI. La garder permet de la reutiliser'
        + ' pour une autre IA.' + #13#10#13#10
        + 'Reponds NON (defaut) pour ne retirer que verdure IA.';
    if MsgBox(Msg, mbConfirmation, MB_YESNO or MB_DEFBUTTON2) = IDYES then
    begin
      DelTree(AppDir + '\ComfyUI', True, True, True);
      DelTree(AppDir + '\python', True, True, True);
      DelTree(AppDir + '\python_embeded', True, True, True);
    end;
  end
  else if CurUninstallStep = usPostUninstall then
    RegDeleteKeyIncludingSubkeys(HKCU, 'Software\verdure IA');
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  if CurPageID = wpReady then
  begin
    // Fusion si une ComfyUI existe deja a cet emplacement.
    Additive := FileExists(ExpandConstant('{app}\ComfyUI\main.py'));
    DownloadPage.Clear;
    if Additive then
      DownloadPage.Add('{#PartsUrl}', 'verdure-parts.zip', '')
    else
      DownloadPage.Add('{#FullUrl}', 'verdure-ai.zip', '');
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
