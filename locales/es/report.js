const reportLocale = {
  schemaVersion: 1,
  language: "es",
  domain: "report",
  text: {
    addNote: "Añade una nota breve antes de enviar el reporte.",
    attachedContext: "Contexto adjunto",
    back: "Volver",
    completeRequired: "Selecciona un problema e incluye los detalles antes de enviar el reporte.",
    date: "Fecha",
    details: "Detalles",
    emailPlaceholder: "tu-correo@ejemplo.com",
    issue: "Problema",
    issueOptions: {
      "": "Selecciona un problema",
      "match-score-schedule": "Partido, marcador u horario",
      "lineup-player": "Alineación o información de jugadores",
      "prediction-standings": "Pronóstico o tabla de posiciones",
      other: "Otro"
    },
    metaDescription: "Reporta un problema con el calendario o los datos de World Cup Simplified.",
    optional: "(opcional)",
    reportFailed: "No pudimos enviar el reporte. Inténtalo de nuevo más tarde.",
    reportHeading: "Reportar un problema",
    reportSent: "Reporte enviado. Gracias.",
    replyEmail: "Correo de contacto",
    sending: "Enviando…",
    sendReport: "Enviar reporte",
    timezone: "Zona horaria",
    title: "Reportar un problema | World Cup Simplified",
    website: "Sitio web",
    whatChanged: "¿Qué debemos corregir?"
  },
  footerText: {
    dataRefreshed: "Datos actualizados el",
    fallbackRelease: "Las notas de la versión explican los cambios más recientes de la aplicación.",
    latestChanges: "Cambios recientes",
    madeBy: "Creado por",
    predictions: "Los pronósticos no son oficiales.",
    releaseNotes: "Ver notas de la versión",
    releaseNotesLabel: "Notas de la versión",
    reportIssue: "Reportar un problema",
    seeSources: "Ver fuentes",
    sources: "Fuentes",
    tournamentFacts: "Datos del torneo",
    tournamentFactsAndConfirmedLineups: "Datos del torneo y alineaciones confirmadas",
    forecasts: "Pronósticos",
    publicBettingMarkets: "mercados públicos de apuestas",
    predictedLineupsAndTeamNews: "Alineaciones previstas y noticias de los equipos",
    playerInformation: "Información de jugadores",
    headToHeadRecords: "Historial de enfrentamientos",
    officialHighlights: "Resúmenes oficiales",
    exactSources: "Las fuentes exactas varían según el partido."
  },
  formatting: {
    creatorPattern: "Creado por {creator}",
    labelSeparator: ": ",
    sentenceEnd: "."
  },
  timeZoneNames: {
    UTC: "UTC",
    "America/Los_Angeles": "Los Ángeles",
    "America/Vancouver": "Vancouver",
    "America/Denver": "Denver",
    "America/Chicago": "Chicago",
    "America/Mexico_City": "Ciudad de México",
    "America/New_York": "Nueva York",
    "America/Toronto": "Toronto",
    "America/Sao_Paulo": "São Paulo",
    "Europe/London": "Londres",
    "Europe/Paris": "París",
    "Europe/Madrid": "Madrid",
    "Europe/Berlin": "Berlín",
    "Africa/Casablanca": "Casablanca",
    "Africa/Lagos": "Lagos",
    "Africa/Johannesburg": "Johannesburgo",
    "Asia/Dubai": "Dubái",
    "Asia/Kolkata": "Calcuta",
    "Asia/Bangkok": "Bangkok",
    "Asia/Shanghai": "Shanghái",
    "Asia/Tokyo": "Tokio",
    "Australia/Sydney": "Sídney"
  },
  releaseNotes: {
    "Cleaner, timezone-aware data freshness": {
      title: "Actualización de datos más clara y adaptada a la zona horaria",
      highlights: [
        "El pie de página ahora presenta de forma concisa los enlaces de confianza: Ver fuentes, la hora de la última actualización de datos y Ver notas de la versión, sin repetir el aviso sobre pronósticos no oficiales.",
        "La actualización de datos ahora indica hoy o ayer en minúsculas cuando corresponde; en los demás casos muestra la fecha. El día y la hora siguen la zona horaria seleccionada sin repetir su abreviatura.",
        "La aplicación principal y la página Reportar un problema ahora comparten el mismo texto y comportamiento de zona horaria en el pie de página, con comprobaciones automáticas para Los Ángeles y Tokio."
      ]
    },
    "Clearer tooltips, smoother match selection, and stronger football visuals": {
      title: "Información más clara, selección de partidos más fluida y una identidad futbolística más sólida",
      highlights: [
        "La información emergente de la tarjeta desplazable con los detalles del partido ahora detecta si quedaría recortada verticalmente. Cuando no hay suficiente espacio arriba, se abre debajo del control; si lo hay, conserva su posición habitual encima.",
        "La fila de Jarell Quansah en el banquillo por suspensión conserva el estado en la etiqueta de accesibilidad y en la información de la tarjeta roja, sin repetir “Suspendido” dentro de la insignia. La explicación extensa se ajusta correctamente y permanece dentro de la pantalla.",
        "En los resultados compactos de búsqueda por país, al seleccionar un partido la página ahora se desplaza suavemente hasta sus detalles. Si está activada la reducción de movimiento, el cambio sigue siendo inmediato."
      ]
    }
  }
};

export default reportLocale;
