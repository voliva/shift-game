import { writable } from "svelte/store";

export const languages = ["en", "es", "ca"] as const;
export type Language = (typeof languages)[number];

const storedLanguage =
  typeof localStorage === "undefined"
    ? null
    : localStorage.getItem("shift-game.language");
export const language = writable<Language>(
  languages.includes(storedLanguage as Language)
    ? (storedLanguage as Language)
    : "en",
);

language.subscribe((value) => {
  if (typeof localStorage !== "undefined")
    localStorage.setItem("shift-game.language", value);
});

export const messages = {
  en: {
    language: "Language",
    gameName: "Shift Game",
    raceTheWind: "Race the wind.",
    localRace: "Race locally against AI",
    onlinePlay: "Online play",
    onlinePlayLabel: "ONLINE PLAY",
    findRoom: "Find a room",
    refresh: "Refresh",
    back: "Back",
    lookingForRooms: "Looking for rooms...",
    onlineUnavailable: "Online play is unavailable",
    onlineUnavailableDetail:
      "Online play is unavailable right now. Please try again later.",
    tryAgain: "Try again",
    sailors: "sailors",
    secondsToGate: "seconds to gate",
    ongoing: "ongoing",
    waiting: "waiting",
    createRoom: "Create a room",
    roomName: "Room name",
    password: "Password",
    create: "Create room",
    creating: "Creating...",
    joinRoom: "JOIN ROOM",
    cancel: "Cancel",
    join: "Join room",
    roomLobby: "ROOM LOBBY",
    ongoingRoom: "ONGOING ROOM",
    leaveRoom: "Leave room",
    boatName: "Boat name",
    host: "host",
    joinOngoingHint:
      "Joining an ongoing race places you roughly three quarters of the way from the leader to the last boat.",
    raceSettings: "Race settings",
    gateDistance: "Gate distance",
    gatesToWin: "Gates to win",
    needSailor: "Need one more sailor",
    startRace: "Start race",
    firstTo: "first to",
    gatesWins: "gates wins",
    waitingForHost: "Waiting for the host to start the race.",
    ranking: "Ranking",
    leader: "Leader",
    secondsBehind: "s behind",
    leaveRace: "Leave race",
    congratulations: "Congratulations!",
    raceComplete: "Race complete",
    ended: "You ended",
    course: "COURSE",
    courseMinimap: "Course minimap",
    gameCanvas: "Shift Game",
    localPlayer: "You",
    aiPlayer: "Tack Sparrow",
  },
  es: {
    language: "Idioma",
    gameName: "Rolada",
    raceTheWind: "Navega hacia el viento.",
    localRace: "Jugar contra una IA",
    onlinePlay: "Jugar en línea",
    onlinePlayLabel: "JUEGO EN LÍNEA",
    findRoom: "Buscar una sala",
    refresh: "Actualizar",
    back: "Volver",
    lookingForRooms: "Buscando salas...",
    onlineUnavailable: "El juego en línea no está disponible",
    onlineUnavailableDetail:
      "El juego en línea no está disponible ahora. Vuelve a intentarlo más tarde.",
    tryAgain: "Reintentar",
    sailors: "navegantes",
    secondsToGate: "de distancia por puerta",
    ongoing: "en curso",
    waiting: "esperando",
    createRoom: "Crear una sala",
    roomName: "Nombre de la sala",
    password: "Contraseña",
    create: "Crear sala",
    creating: "Creando...",
    joinRoom: "UNIRSE A LA SALA",
    cancel: "Cancelar",
    join: "Unirse a la sala",
    roomLobby: "SALA",
    ongoingRoom: "SALA EN CURSO",
    leaveRoom: "Salir de la sala",
    boatName: "Nombre del barco",
    host: "anfitrión",
    joinOngoingHint:
      "Al unirte a una carrera en curso aparecerás aproximadamente a tres cuartos de la distancia entre el líder y el último barco.",
    raceSettings: "Ajustes de carrera",
    gateDistance: "Distancia entre puertas",
    gatesToWin: "Puertas para ganar",
    needSailor: "Falta un navegante",
    startRace: "Empezar carrera",
    firstTo: "el primero en",
    gatesWins: "puertas gana",
    waitingForHost: "Esperando a que el anfitrión inicie la carrera.",
    ranking: "Clasificación",
    leader: "Líder",
    secondsBehind: "s detrás",
    leaveRace: "Salir de la carrera",
    congratulations: "¡Felicidades!",
    raceComplete: "Carrera terminada",
    ended: "Has terminado en",
    course: "RECORRIDO",
    courseMinimap: "Minimapa del recorrido",
    gameCanvas: "Shift Game",
    localPlayer: "Tú",
    aiPlayer: "Capitán Virada",
  },
  ca: {
    language: "Idioma",
    gameName: "Rolada",
    raceTheWind: "Navega contra el vent.",
    localRace: "Juga contra una IA",
    onlinePlay: "Juga en línia",
    onlinePlayLabel: "JOC EN LÍNIA",
    findRoom: "Cerca una sala",
    refresh: "Actualitza",
    back: "Enrere",
    lookingForRooms: "Cercant sales...",
    onlineUnavailable: "El joc en línia no està disponible",
    onlineUnavailableDetail:
      "El joc en línia no està disponible ara. Torna-ho a provar més tard.",
    tryAgain: "Torna-ho a provar",
    sailors: "navegants",
    secondsToGate: "de distancia per porta",
    ongoing: "en curs",
    waiting: "esperant",
    createRoom: "Crea una sala",
    roomName: "Nom de la sala",
    password: "Contrasenya",
    create: "Crea una sala",
    creating: "Creant...",
    joinRoom: "UNEIX-TE A LA SALA",
    cancel: "Cancel·la",
    join: "Uneix-te a la sala",
    roomLobby: "SALA",
    ongoingRoom: "SALA EN CURS",
    leaveRoom: "Surt de la sala",
    boatName: "Nom del vaixell",
    host: "amfitrió",
    joinOngoingHint:
      "En unir-te a una cursa en curs apareixeràs aproximadament a tres quartes parts de la distància entre el líder i l’últim vaixell.",
    raceSettings: "Ajustos de cursa",
    gateDistance: "Distància entre portes",
    gatesToWin: "Portes per guanyar",
    needSailor: "Falta un navegant",
    startRace: "Comença la cursa",
    firstTo: "el primer a",
    gatesWins: "portes guanya",
    waitingForHost: "Esperant que l’amfitrió iniciï la cursa.",
    ranking: "Classificació",
    leader: "Líder",
    secondsBehind: "s darrere",
    leaveRace: "Surt de la cursa",
    congratulations: "Felicitats!",
    raceComplete: "Cursa acabada",
    ended: "Has acabat en",
    course: "RECORREGUT",
    courseMinimap: "Minimapa del recorregut",
    gameCanvas: "Shift Game",
    localPlayer: "Tu",
    aiPlayer: "Capità Virada",
  },
} as const;

export function finishPosition(locale: Language, rank: number): string {
  if (locale === "en")
    return `${rank}${rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th"}`;
  return `${rank}.ª`;
}

export function optionalLabel(locale: Language): string {
  if (locale === "es" || locale === "ca") return "(opcional)";
  return "(optional)";
}
