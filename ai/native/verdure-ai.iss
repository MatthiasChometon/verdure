; Installeur "verdure IA" — INCREMENTAL + ADDITIF / MUTUALISE.
;
; Le principe : un manifeste distant (manifest.json, quelques octets) decrit chaque
; composant telechargeable (le runtime ~5.5 Go, les pieces verdure ~1 Mo) avec son
; empreinte SHA-256. A chaque lancement l'installeur telecharge d'abord CE manifeste,
; le compare a l'etat local ({app}\verdure-state.txt ecrit a la derniere install), et
; ne (re)telecharge QUE les composants absents ou dont l'empreinte a change. Un
; relancement sans nouvelle version ne telecharge donc plus rien (avant : le zip
; complet a chaque fois).
;
; Trois cas, detectes automatiquement :
;   - CREATION  : pas de ComfyUI a l'emplacement cible -> runtime complet + pieces.
;   - FUSION    : une ComfyUI existe deja (a l'utilisateur), pas d'etat verdure ->
;                 on ajoute seulement les pieces verdure, on ne touche pas au runtime.
;   - MISE A JOUR : etat verdure present -> diff par empreinte, on ne prend que le neuf.
;
; Integrite : chaque telechargement est verifie par son SHA-256 (parametre du
; downloader Inno). Reprise : l'etat local est ecrit composant par composant, donc une
; install interrompue reprend la ou elle s'etait arretee au relancement.
;
; Compiler avec ISCC.exe. Publier manifest.json (voir make-manifest.ps1) a cote des
; archives sur https://verdureee.duckdns.org/dl/.

#define MyAppName "verdure IA"
#define MyAppVersion "1.5"
#define BaseUrl "https://verdureee.duckdns.org/dl/"
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
; L'extraction des composants (runtime / pieces) se fait desormais dans [Code]
; (CurStepChanged/ssPostInstall) pour n'extraire QUE ce qui a ete telecharge.
; Ne restent ici que les deps pip et le lancement.
; Deps CRITIQUES du launcher (icone barre des taches) — separees pour toujours
; reussir, quelle que soit la version de python. Ne s'executent que si un composant
; a change (fresh install ou nouvelles pieces) : inutile de repasser pip a chaque
; lancement quand rien n'a bouge.
Filename: "{code:PyExe}"; Parameters: "-m pip install --disable-pip-version-check --no-warn-script-location pystray Pillow einops"; StatusMsg: "Installation du launcher..."; Flags: runhidden waituntilterminated; Check: NeedDepsCheck
; Deps d'identification (best-effort). transformers a des wheels pour toute
; version ; le wheel llama-cpp est cp312 et echoue sur un autre python (dans ce
; cas le llama_cpp deja present de ta ComfyUI sert). Un echec ici n'empeche pas
; l'app de se lancer.
Filename: "{code:PyExe}"; Parameters: "-m pip install --disable-pip-version-check --no-warn-script-location transformers"; StatusMsg: "Installation des dependances IA..."; Flags: runhidden waituntilterminated; Check: NeedDepsCheck
Filename: "{code:PyExe}"; Parameters: "-m pip install --disable-pip-version-check --no-warn-script-location {#LlamaWheel}"; StatusMsg: "Installation du moteur d'identification..."; Flags: runhidden waituntilterminated; Check: NeedDepsCheck
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
Type: files; Name: "{app}\verdure-state.txt"

[Code]
const
  RUNTIME_FOREIGN = 'foreign';  // marque un ComfyUI qui appartient a l'utilisateur

var
  DownloadPage: TDownloadWizardPage;
  FreshInstall: Boolean;   // aucun ComfyUI cible -> runtime complet
  AdoptExisting: Boolean;  // ComfyUI de l'utilisateur, sans etat verdure -> fusion
  DepsNeeded: Boolean;     // relancer pip ? (fresh ou pieces changees)
  // Manifeste distant (parse ligne par ligne).
  ManVersion: String;
  CompId: array of String;
  CompFile: array of String;
  CompSha: array of String;
  CompStrip: array of Integer;
  CompCount: Integer;
  // Plan de travail, indexe comme les composants.
  Planned: array of Boolean;   // ce composant est-il pertinent pour ce cas ?
  ToFetch: array of Boolean;   // faut-il le (re)telecharger ?
  UpToDateCount, FetchedCount: Integer;
  // Etat local ({app}\verdure-state.txt), en cle=valeur.
  StKey: array of String;
  StVal: array of String;
  StCount: Integer;

// --- petit lecteur JSON, suffisant pour le schema plat et controle du manifeste ---
function JsonStr(Line, Key: String): String;
var p, q: Integer; pat: String;
begin
  Result := '';
  pat := '"' + Key + '":"';
  p := Pos(pat, Line);
  if p = 0 then exit;
  p := p + Length(pat);
  q := p;
  while (q <= Length(Line)) and (Line[q] <> '"') do q := q + 1;
  Result := Copy(Line, p, q - p);
end;

function JsonInt(Line, Key: String): Integer;
var p, q: Integer; pat, num: String;
begin
  Result := 0;
  pat := '"' + Key + '":';
  p := Pos(pat, Line);
  if p = 0 then exit;
  p := p + Length(pat);
  q := p;
  while (q <= Length(Line)) and (Line[q] >= '0') and (Line[q] <= '9') do q := q + 1;
  num := Copy(Line, p, q - p);
  Result := StrToIntDef(num, 0);
end;

procedure ParseManifest(Path: String);
var Lines: TArrayOfString; i: Integer; line, id: String;
begin
  CompCount := 0;
  SetArrayLength(CompId, 0); SetArrayLength(CompFile, 0);
  SetArrayLength(CompSha, 0); SetArrayLength(CompStrip, 0);
  if not LoadStringsFromFile(Path, Lines) then exit;
  for i := 0 to GetArrayLength(Lines) - 1 do begin
    line := Lines[i];
    if (ManVersion = '') and (Pos('"version":"', line) > 0) then
      ManVersion := JsonStr(line, 'version');
    id := JsonStr(line, 'id');
    if id <> '' then begin
      CompCount := CompCount + 1;
      SetArrayLength(CompId, CompCount); SetArrayLength(CompFile, CompCount);
      SetArrayLength(CompSha, CompCount); SetArrayLength(CompStrip, CompCount);
      CompId[CompCount - 1] := id;
      CompFile[CompCount - 1] := JsonStr(line, 'file');
      CompSha[CompCount - 1] := Lowercase(JsonStr(line, 'sha256'));
      CompStrip[CompCount - 1] := JsonInt(line, 'strip');
    end;
  end;
end;

// --- etat local : cle=valeur, une par ligne ---
function StatePath: String;
begin
  Result := ExpandConstant('{app}\verdure-state.txt');
end;

procedure LoadState;
var Lines: TArrayOfString; i, e: Integer; ln: String;
begin
  StCount := 0;
  SetArrayLength(StKey, 0); SetArrayLength(StVal, 0);
  if not FileExists(StatePath) then exit;
  if not LoadStringsFromFile(StatePath, Lines) then exit;
  for i := 0 to GetArrayLength(Lines) - 1 do begin
    ln := Trim(Lines[i]);
    e := Pos('=', ln);
    if e > 1 then begin
      StCount := StCount + 1;
      SetArrayLength(StKey, StCount); SetArrayLength(StVal, StCount);
      StKey[StCount - 1] := Copy(ln, 1, e - 1);
      StVal[StCount - 1] := Copy(ln, e + 1, Length(ln) - e);
    end;
  end;
end;

function GetState(Key: String): String;
var i: Integer;
begin
  Result := '';
  for i := 0 to StCount - 1 do
    if StKey[i] = Key then begin Result := StVal[i]; exit; end;
end;

procedure SaveState;
var i: Integer; buf: String;
begin
  buf := '';
  for i := 0 to StCount - 1 do
    buf := buf + StKey[i] + '=' + StVal[i] + #13#10;
  SaveStringToFile(StatePath, buf, False);
end;

procedure SetStateAndSave(Key, Val: String);
var i: Integer; found: Boolean;
begin
  found := False;
  for i := 0 to StCount - 1 do
    if StKey[i] = Key then begin StVal[i] := Val; found := True; break; end;
  if not found then begin
    StCount := StCount + 1;
    SetArrayLength(StKey, StCount); SetArrayLength(StVal, StCount);
    StKey[StCount - 1] := Key; StVal[StCount - 1] := Val;
  end;
  SaveState;
end;

// Un jalon prouvant que le composant est deja pose sur le disque (au cas ou l'etat
// serait present mais les fichiers effaces a la main).
function ComponentPresent(Idx: Integer): Boolean;
begin
  if CompId[Idx] = 'runtime' then
    Result := FileExists(ExpandConstant('{app}\ComfyUI\main.py'))
  else if CompId[Idx] = 'parts' then
    Result := DirExists(ExpandConstant('{app}\ComfyUI\custom_nodes\ComfyUI-QwenVL'))
  else
    Result := False;
end;

// Le runtime complet ne concerne QUE la creation. En fusion/mise a jour on ne
// retelecharge jamais 5.5 Go : on garde la ComfyUI en place.
function ComponentIsRelevant(Idx: Integer): Boolean;
begin
  if CompId[Idx] = 'runtime' then
    Result := FreshInstall
  else
    Result := True;  // les pieces verdure : toujours pertinentes
end;

procedure BuildPlan;
var i: Integer; local: String;
begin
  SetArrayLength(Planned, CompCount);
  SetArrayLength(ToFetch, CompCount);
  UpToDateCount := 0;
  DepsNeeded := FreshInstall;  // un runtime neuf impose toujours les deps
  for i := 0 to CompCount - 1 do begin
    Planned[i] := ComponentIsRelevant(i);
    ToFetch[i] := False;
    if not Planned[i] then continue;
    local := Lowercase(GetState(CompId[i]));
    if (local = CompSha[i]) and ComponentPresent(i) then
      UpToDateCount := UpToDateCount + 1   // deja a jour : rien a faire
    else begin
      ToFetch[i] := True;
      if CompId[i] = 'parts' then DepsNeeded := True;
    end;
  end;
end;

function DownloadManifest: Boolean;
begin
  DownloadPage.Clear;
  DownloadPage.Add('{#BaseUrl}manifest.json', 'manifest.json', '');
  DownloadPage.Show;
  try
    try
      DownloadPage.Download;
      Result := True;
    except
      if DownloadPage.AbortedByUser then
        Log('Telechargement du manifeste annule.')
      else
        SuppressibleMsgBox(AddPeriod(GetExceptionMessage), mbCriticalError, MB_OK, IDOK);
      Result := False;
    end;
  finally
    DownloadPage.Hide;
  end;
end;

function DownloadChanged: Boolean;
var i, queued: Integer;
begin
  Result := True;
  queued := 0;
  DownloadPage.Clear;
  for i := 0 to CompCount - 1 do
    if ToFetch[i] then begin
      // 3e parametre = SHA-256 attendu -> le downloader Inno verifie l'integrite.
      DownloadPage.Add('{#BaseUrl}' + CompFile[i], CompFile[i], CompSha[i]);
      queued := queued + 1;
    end;
  if queued = 0 then exit;  // tout est deja a jour : aucun octet a telecharger
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
end;

function ExtractComponent(Idx: Integer): Boolean;
var params, src, app: String; rc: Integer;
begin
  src := ExpandConstant('{tmp}\') + CompFile[Idx];
  app := ExpandConstant('{app}');
  if CompStrip[Idx] > 0 then
    // runtime : archive prefixee d'un dossier -> on l'aplati.
    params := '-xf "' + src + '" --strip-components=' + IntToStr(CompStrip[Idx]) + ' -C "' + app + '"'
  else
    // pieces verdure : chemins deja relatifs a {app}, on ecrase (mise a jour).
    // (Pas de -k : sinon une nouvelle version des pieces ne remplacerait jamais
    //  l'ancienne. Les pieces n'appartiennent qu'a verdure, ecraser est sur.)
    params := '-xf "' + src + '" -C "' + app + '"';
  Result := Exec(ExpandConstant('{sys}\tar.exe'), params, '', SW_HIDE, ewWaitUntilTerminated, rc) and (rc = 0);
end;

// Repertoire du python a utiliser sous {app} : 'python' (le notre) ou
// 'python_embeded' (ComfyUI officiel de l'utilisateur, mode fusion).
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
    'Recuperation des composants manquants ou mis a jour. Les composants deja a jour ne sont pas retelecharges.',
    nil);
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID <> wpReady then exit;

  // Cas : creation, fusion, ou mise a jour ?
  FreshInstall := not FileExists(ExpandConstant('{app}\ComfyUI\main.py'));
  AdoptExisting := (not FreshInstall) and (not FileExists(StatePath));

  if not DownloadManifest then begin Result := False; exit; end;
  ParseManifest(ExpandConstant('{tmp}\manifest.json'));
  if CompCount = 0 then begin
    SuppressibleMsgBox('Manifeste illisible ou vide. Reessaie plus tard.', mbCriticalError, MB_OK, IDOK);
    Result := False; exit;
  end;

  LoadState;
  BuildPlan;
  Result := DownloadChanged;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var i: Integer;
begin
  if CurStep <> ssPostInstall then exit;

  // {app} et les fichiers du [Files] existent maintenant : on extrait ce qui a ete
  // telecharge, et on inscrit l'etat composant par composant (=> reprise possible).
  FetchedCount := 0;
  for i := 0 to CompCount - 1 do
    if ToFetch[i] then begin
      if ExtractComponent(i) then begin
        SetStateAndSave(CompId[i], CompSha[i]);
        FetchedCount := FetchedCount + 1;
      end else
        SuppressibleMsgBox('Echec de l''extraction du composant "' + CompId[i]
          + '". Relance l''installeur pour reprendre.', mbError, MB_OK, IDOK);
    end;

  // Fusion : la ComfyUI appartient a l'utilisateur -> on ne la retelechargera jamais.
  if AdoptExisting and (GetState('runtime') = '') then
    SetStateAndSave('runtime', RUNTIME_FOREIGN);
  if ManVersion <> '' then SetStateAndSave('version', ManVersion);

  // Trace pour le desinstallateur : 'foreign' = ComfyUI de l'utilisateur (a NE PAS
  // proposer d'effacer sans avertissement fort), sinon posee par verdure.
  if GetState('runtime') = RUNTIME_FOREIGN then
    RegWriteStringValue(HKCU, 'Software\verdure IA', 'InstallMode', RUNTIME_FOREIGN)
  else
    RegWriteStringValue(HKCU, 'Software\verdure IA', 'InstallMode', 'fresh');
end;

procedure CurPageChanged(CurPageID: Integer);
var msg: String;
begin
  if CurPageID <> wpFinished then exit;
  if FreshInstall then
    msg := 'verdure IA est installe.'
  else
    msg := 'verdure IA est a jour.';
  msg := msg + #13#10#13#10
    + IntToStr(UpToDateCount) + ' composant(s) deja a jour, '
    + IntToStr(FetchedCount) + ' telecharge(s).';
  WizardForm.FinishedLabel.Caption := msg;
end;

// Desinstallation : on retire toujours les pieces verdure ([UninstallDelete]).
// En plus, on PROPOSE de retirer aussi ComfyUI + le python — refuse par defaut.
function NeedDepsCheck: Boolean;
begin
  Result := DepsNeeded;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var Mode, Msg, AppDir: String;
begin
  if CurUninstallStep = usUninstall then
  begin
    AppDir := ExpandConstant('{app}');
    if not RegQueryStringValue(HKCU, 'Software\verdure IA', 'InstallMode', Mode) then
      Mode := '';
    if Mode = RUNTIME_FOREIGN then
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
