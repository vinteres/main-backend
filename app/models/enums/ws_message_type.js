const WsMessageType = Object.freeze({
  INTRO: 'intro',
  MSG: 'msg',
  NOTIFS_COUNT: 'notifs_count',
  MSGS: 'msgs',
  SEE_INTROS: 'see_intros',
  SEE_MSG: 'see_msg',
  NOTIF: 'notif',
  SEE_VISITS: 'see_visits',
  SEE_MATCHES: 'see_matches'
});

module.exports = WsMessageType;
