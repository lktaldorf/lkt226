// ============================================================
// LKT TRACKER 2026 - Google Apps Script Backend
// ============================================================
// Kopiere diesen Code in Google Apps Script (Erweiterungen → Apps Script)
// ============================================================

// Spreadsheet-Struktur wird automatisch erstellt
const SHEET_MEMBERS = 'Mitglieder';
const SHEET_EVENTS = 'Auftritte';
const SHEET_ATTENDANCE = 'Anwesenheit';
const SHEET_ANZEIGEN = 'Strafanzeigen';

// ============================================================
// WEB APP ENDPOINTS
// ============================================================

function doGet(e) {
  const action = e.parameter.action;
  
  try {
    let result;
    
    switch(action) {
      case 'getEvents':
        result = getEvents();
        break;
      case 'getMembers':
        result = getMembers();
        break;
      case 'getAttendance':
        result = getAttendance(e.parameter.eventId);
        break;
      case 'getMemberAttendance':
        result = getMemberAttendance(e.parameter.name);
        break;
      case 'getEventAttendance':
        result = getEventAttendance(e.parameter.eventId);
        break;
      case 'getAnzeigen':
        result = getAnzeigen();
        break;
      case 'getStats':
        result = getStats();
        break;
      default:
        result = { error: 'Unknown action' };
    }
    
    return jsonResponse(result);
  } catch(err) {
    return jsonResponse({ error: err.toString() });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    let result;
    
    switch(action) {
      case 'registerMember':
        result = registerMember(data.name, data.pin);
        break;
      case 'checkIn':
        result = checkIn(data.name, data.eventId);
        break;
      case 'markAbsent':
        result = markAbsent(data.name, data.eventId, data.comment);
        break;
      case 'resetAttendance':
        result = resetAttendance(data.name, data.eventId);
        break;
      case 'submitAnzeige':
        result = submitAnzeige(data);
        break;
      case 'deleteMember':
        result = deleteMember(data.name);
        break;
      case 'saveEventAttendance':
        result = saveEventAttendance(data.eventId, data.attendance);
        break;
      case 'initSheet':
        result = initializeSheet();
        break;
      default:
        result = { error: 'Unknown action' };
    }
    
    return jsonResponse(result);
  } catch(err) {
    return jsonResponse({ error: err.toString() });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// INITIALIZATION
// ============================================================

function initializeSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Mitglieder Sheet
  let membersSheet = ss.getSheetByName(SHEET_MEMBERS);
  if (!membersSheet) {
    membersSheet = ss.insertSheet(SHEET_MEMBERS);
    membersSheet.appendRow(['PIN', 'Name', 'Registriert am']);
    membersSheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#ffd700');
  }
  
  // Auftritte Sheet
  let eventsSheet = ss.getSheetByName(SHEET_EVENTS);
  if (!eventsSheet) {
    eventsSheet = ss.insertSheet(SHEET_EVENTS);
    eventsSheet.appendRow(['ID', 'Woche', 'Datum', 'Name', 'Ort', 'Zeit']);
    eventsSheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#ffd700');
    
    // Standard-Auftritte einfügen
    const events = [
      // WE 1
      ['WE1-1', 'WE 1', '09.01.2026', 'Narrenbaumstellen Taldorf', 'LK Taldorf', ''],
      ['WE1-2', 'WE 1', '10.01.2026', 'Narrenbaumstellen Taldorf', 'LK Taldorf', ''],
      ['WE1-3', 'WE 1', '11.01.2026', 'Narrenbaumstellen Taldorf', 'LK Taldorf', ''],
      // WE 2
      ['WE2-1', 'WE 2', '16.01.2026', 'Jugendball Bitzenhofen', 'NZ Bitzenhofen', '21:00'],
      ['WE2-2', 'WE 2', '16.01.2026', 'Elchball', 'MV Ettenkirch', '00:30'],
      ['WE2-3', 'WE 2', '17.01.2026', 'Umzug Neuravensburg', 'NZ Neuravensburg Bären', '13:30'],
      ['WE2-4', 'WE 2', '17.01.2026', 'Butzlumpa-Ball', 'LaJu KO/LK Butzlumpa', '21:00'],
      ['WE2-5', 'WE 2', '17.01.2026', 'Mädla-Ball', 'LK Leupolz', '23:00'],
      ['WE2-6', 'WE 2', '18.01.2026', 'Umzug Langenargen', 'NZ Dammglonker', '13:00'],
      // WE 3
      ['WE3-1', 'WE 3', '23.01.2026', 'Urknall-Ball', 'LK Allgaier Urband', '20:00'],
      ['WE3-2', 'WE 3', '23.01.2026', 'Interne Veranstaltung', 'LK Fötzlesbrass', '00:00'],
      ['WE3-3', 'WE 3', '24.01.2026', 'Jubiläumsumzug Erbisreute', 'Erbisreuter Dorfnarren', '13:00'],
      ['WE3-4', 'WE 3', '25.01.2026', 'Narrensprung Kluftern', 'NZ Kluftern', '13:30'],
      ['WE4-1', 'WE 4', '30.01.2026', 'Zirkusball', 'LK Mecka', '23:30'],
      ['WE4-2', 'WE 4', '31.01.2026', 'Narrenbaumstellen Bitzenhofen', 'NZ Bitzenhofen', '13:00'],
      ['WE5-1', 'WE 5', '07.02.2026', 'Dämmerumzug Hergensweiler', 'NZ Federfuxer', '16:00'],
      ['WE5-2', 'WE 5', '07.02.2026', 'Aprés-Ski Ball', 'NZ Ettenkirch', '23:30'],
      ['WE5-3', 'WE 5', '08.02.2026', 'Umzug Meersburg', 'NZ Meersburg', '13:00'],
      ['HF-1', 'Hauptfasnet', '11.02.2026', 'Weiberball', 'Löwen Urnau', '22:00'],
      ['HF-2', 'Hauptfasnet', '12.02.2026', 'Golm', 'Berggasthof Golm', '11:00'],
      ['HF-3', 'Hauptfasnet', '13.02.2026', 'Kindergartenbefreiung', 'Taldorf', '09:00'],
      ['HF-4', 'Hauptfasnet', '13.02.2026', 'Schülerbefreiung', 'Wilhelmsschule Ravensburg', '10:00'],
      ['HF-5', 'Hauptfasnet', '13.02.2026', 'OWB', 'OWB Ravensburg', '11:30'],
      ['HF-6', 'Hauptfasnet', '13.02.2026', 'Narrenbaumstellen Bavendorf', 'NV Bavendorf', '14:00'],
      ['HF-7', 'Hauptfasnet', '14.02.2026', 'Narrensprung Aitrach', 'NZ Aitrach', '13:30'],
      ['HF-8', 'Hauptfasnet', '14.02.2026', 'Ball Aitrach', 'NZ Aitrach', '23:30'],
      ['HF-9', 'Hauptfasnet', '15.02.2026', 'Narrensprung Brochenzell', 'NZ Brochenzell', '14:00'],
      ['HF-10', 'Hauptfasnet', '16.02.2026', 'Rosenmontagssprung Fulda', 'Wolkenkratzer Fulda', '13:30'],
      ['HF-11', 'Hauptfasnet', '17.02.2026', 'Heimfahrt Fulda', '', ''],
    ];
    
    events.forEach(event => eventsSheet.appendRow(event));
  }
  
  // Anwesenheit Sheet
  let attendanceSheet = ss.getSheetByName(SHEET_ATTENDANCE);
  if (!attendanceSheet) {
    attendanceSheet = ss.insertSheet(SHEET_ATTENDANCE);
    attendanceSheet.appendRow(['PIN', 'Name', 'Event-ID', 'Status', 'Kommentar', 'Zeitstempel']);
    attendanceSheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#4ade80');
  }
  
  // Strafanzeigen Sheet
  let anzeigeSheet = ss.getSheetByName(SHEET_ANZEIGEN);
  if (!anzeigeSheet) {
    anzeigeSheet = ss.insertSheet(SHEET_ANZEIGEN);
    anzeigeSheet.appendRow(['ID', 'Datum', 'Melder', 'Beschuldigter', 'Tatbestand', 'Zeugen', 'Strafvorschlag', 'Status']);
    anzeigeSheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#ef4444');
  }
  
  return { success: true, message: 'Sheet initialisiert!' };
}

// ============================================================
// MEMBER FUNCTIONS
// ============================================================

function registerMember(name, pin) {
  if (!name || !pin) {
    return { error: 'Name und PIN erforderlich' };
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_MEMBERS);
  const data = sheet.getDataRange().getValues();
  
  // Check if name already exists (name must be unique, PIN doesn't matter)
  for (let i = 1; i < data.length; i++) {
    if (data[i][1].toLowerCase() == name.toLowerCase()) {
      return { error: 'Name bereits registriert' };
    }
  }
  
  sheet.appendRow([pin, name, new Date().toISOString()]);
  
  return { success: true, name: name, pin: pin };
}

function getMembers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_MEMBERS);
  const data = sheet.getDataRange().getValues();
  
  const members = [];
  for (let i = 1; i < data.length; i++) {
    members.push({
      pin: data[i][0],
      name: data[i][1],
      registeredAt: data[i][2]
    });
  }
  
  return { members: members };
}

function getMemberByPin(pin) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_MEMBERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) == String(pin)) {
      return { pin: data[i][0], name: data[i][1], row: i + 1 };
    }
  }
  
  return null;
}

function getMemberByName(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_MEMBERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1].toLowerCase() == name.toLowerCase()) {
      return { pin: data[i][0], name: data[i][1], row: i + 1 };
    }
  }
  
  return null;
}

function getMemberByNameAndPin(name, pin) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_MEMBERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1].toLowerCase() == name.toLowerCase() && String(data[i][0]) == String(pin)) {
      return { pin: data[i][0], name: data[i][1], row: i + 1 };
    }
  }
  
  return null;
}

function deleteMember(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Find member by name
  const member = getMemberByName(name);
  if (!member) {
    return { error: 'Mitglied nicht gefunden' };
  }
  
  // Delete member from members sheet
  const membersSheet = ss.getSheetByName(SHEET_MEMBERS);
  membersSheet.deleteRow(member.row);
  
  // Delete all attendance records for this member (by name, since name is unique)
  const attendanceSheet = ss.getSheetByName(SHEET_ATTENDANCE);
  const attendanceData = attendanceSheet.getDataRange().getValues();
  
  // Delete from bottom to top to avoid row index issues
  for (let i = attendanceData.length - 1; i >= 1; i--) {
    if (attendanceData[i][1].toLowerCase() == name.toLowerCase()) {
      attendanceSheet.deleteRow(i + 1);
    }
  }
  
  return { success: true, message: `${member.name} und alle Daten gelöscht` };
}

// ============================================================
// EVENT FUNCTIONS
// ============================================================

function getEvents() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_EVENTS);
  const data = sheet.getDataRange().getValues();
  
  const events = [];
  for (let i = 1; i < data.length; i++) {
    // Format date and time properly
    let dateStr = data[i][2];
    let timeStr = data[i][5];
    
    // If date is a Date object, format it
    if (dateStr instanceof Date) {
      const d = dateStr;
      dateStr = ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear();
    } else if (typeof dateStr === 'string' && dateStr.includes('T')) {
      // ISO string like "2026-01-22T23:00:00.000Z"
      const d = new Date(dateStr);
      dateStr = ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear();
    }
    
    // If time is a Date object, format it
    if (timeStr instanceof Date) {
      const t = timeStr;
      timeStr = ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2);
    } else if (typeof timeStr === 'string' && timeStr.includes('T')) {
      // ISO string
      const t = new Date(timeStr);
      timeStr = ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2);
    }
    
    events.push({
      id: data[i][0],
      week: data[i][1],
      date: dateStr,
      name: data[i][3],
      location: data[i][4],
      time: timeStr
    });
  }
  
  return { events: events };
}

// ============================================================
// ATTENDANCE FUNCTIONS
// ============================================================

function checkIn(name, eventId) {
  // Debug logging
  console.log('checkIn called with name:', name, 'eventId:', eventId);
  
  const member = getMemberByName(name);
  if (!member) {
    console.log('Member not found for name:', name);
    return { error: 'Mitglied nicht gefunden' };
  }
  
  console.log('Found member:', member.name);
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ATTENDANCE);
  const data = sheet.getDataRange().getValues();
  
  // Check if already checked in for THIS event (by name since name is unique)
  for (let i = 1; i < data.length; i++) {
    if (data[i][1].toLowerCase() == name.toLowerCase() && String(data[i][2]) == String(eventId)) {
      // Update existing entry
      console.log('Updating existing entry at row', i + 1);
      sheet.getRange(i + 1, 4).setValue('anwesend');
      sheet.getRange(i + 1, 5).setValue('');
      sheet.getRange(i + 1, 6).setValue(new Date().toISOString());
      return { success: true, message: `${member.name} als anwesend markiert!` };
    }
  }
  
  // New entry - append new row
  console.log('Creating new entry for event:', eventId);
  sheet.appendRow([String(member.pin), member.name, String(eventId), 'anwesend', '', new Date().toISOString()]);
  
  return { success: true, message: `${member.name} eingecheckt bei ${eventId}!` };
}

function markAbsent(name, eventId, comment) {
  const member = getMemberByName(name);
  if (!member) {
    return { error: 'Mitglied nicht gefunden' };
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ATTENDANCE);
  const data = sheet.getDataRange().getValues();
  
  // Check if entry exists (by name)
  for (let i = 1; i < data.length; i++) {
    if (data[i][1].toLowerCase() == name.toLowerCase() && String(data[i][2]) == String(eventId)) {
      // Update existing entry
      sheet.getRange(i + 1, 4).setValue('abwesend');
      sheet.getRange(i + 1, 5).setValue(comment || '');
      sheet.getRange(i + 1, 6).setValue(new Date().toISOString());
      return { success: true, message: `${member.name} als abwesend markiert` };
    }
  }
  
  // New entry
  sheet.appendRow([String(member.pin), member.name, String(eventId), 'abwesend', comment || '', new Date().toISOString()]);
  
  return { success: true, message: `${member.name} als abwesend markiert` };
}

function resetAttendance(name, eventId) {
  const member = getMemberByName(name);
  if (!member) {
    return { error: 'Mitglied nicht gefunden' };
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ATTENDANCE);
  const data = sheet.getDataRange().getValues();
  
  // Find and delete entry (by name)
  for (let i = 1; i < data.length; i++) {
    if (data[i][1].toLowerCase() == name.toLowerCase() && String(data[i][2]) == String(eventId)) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Eintrag gelöscht' };
    }
  }
  
  return { error: 'Eintrag nicht gefunden' };
}

function getMemberAttendance(name) {
  const member = getMemberByName(name);
  if (!member) {
    return { error: 'Mitglied nicht gefunden' };
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ATTENDANCE);
  const data = sheet.getDataRange().getValues();
  
  const attendance = {};
  const comments = {};
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1].toLowerCase() == name.toLowerCase()) {
      const eventId = data[i][2];
      attendance[eventId] = data[i][3] === 'anwesend';
      if (data[i][4]) {
        comments[eventId] = data[i][4];
      }
    }
  }
  
  return { 
    success: true, 
    name: member.name,
    pin: member.pin,
    attendance: attendance, 
    comments: comments 
  };
}

function getAttendance(eventId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ATTENDANCE);
  const data = sheet.getDataRange().getValues();
  
  const attendance = [];
  
  for (let i = 1; i < data.length; i++) {
    if (!eventId || data[i][2] == eventId) {
      attendance.push({
        pin: data[i][0],
        name: data[i][1],
        eventId: data[i][2],
        status: data[i][3],
        comment: data[i][4],
        timestamp: data[i][5]
      });
    }
  }
  
  return { attendance: attendance };
}

// Get attendance for a specific event (for Gericht Anwesenheitsverwaltung)
function getEventAttendance(eventId) {
  if (!eventId) {
    return { error: 'Event ID erforderlich' };
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ATTENDANCE);
  const data = sheet.getDataRange().getValues();
  
  const attendance = {};
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]) === String(eventId)) {
      const name = data[i][1];
      const status = data[i][3];
      attendance[name] = status === 'anwesend';
    }
  }
  
  return { success: true, eventId: eventId, attendance: attendance };
}

// Save attendance for multiple members at once (from Gericht)
function saveEventAttendance(eventId, attendanceMap) {
  if (!eventId) {
    return { error: 'Event ID erforderlich' };
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ATTENDANCE);
  const data = sheet.getDataRange().getValues();
  const membersResult = getMembers();
  const members = membersResult.members || [];
  
  // Build a map of member name to PIN
  const memberPins = {};
  members.forEach(m => {
    memberPins[m.name] = m.pin;
  });
  
  // Find existing entries for this event
  const existingRows = {};
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]) === String(eventId)) {
      existingRows[data[i][1]] = i + 1; // row number (1-indexed)
    }
  }
  
  let updated = 0;
  let created = 0;
  
  // Process each attendance entry
  for (const [memberName, isPresent] of Object.entries(attendanceMap)) {
    const pin = memberPins[memberName];
    if (!pin) continue; // Skip if member not found
    
    const status = isPresent ? 'anwesend' : 'abwesend';
    const timestamp = new Date().toISOString();
    
    if (existingRows[memberName]) {
      // Update existing row
      const row = existingRows[memberName];
      sheet.getRange(row, 4).setValue(status);
      sheet.getRange(row, 6).setValue(timestamp);
      updated++;
    } else {
      // Create new row
      sheet.appendRow([String(pin), memberName, String(eventId), status, '', timestamp]);
      created++;
    }
  }
  
  return { 
    success: true, 
    message: `${updated} aktualisiert, ${created} neu erstellt`,
    updated: updated,
    created: created
  };
}

// ============================================================
// ANZEIGEN FUNCTIONS
// ============================================================

function submitAnzeige(data) {
  if (!data.beschuldigter || !data.tatbestand || !data.strafe) {
    return { error: 'Pflichtfelder fehlen' };
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ANZEIGEN);
  
  const id = 'ANZ-' + Date.now();
  const datum = new Date().toLocaleDateString('de-DE');
  
  sheet.appendRow([
    id,
    datum,
    data.melder || 'Anonym',
    data.beschuldigter,
    data.tatbestand,
    data.zeugen || '',
    data.strafe,
    'offen'
  ]);
  
  return { success: true, id: id, message: 'Anzeige eingereicht!' };
}

function getAnzeigen() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ANZEIGEN);
  const data = sheet.getDataRange().getValues();
  
  const anzeigen = [];
  
  for (let i = 1; i < data.length; i++) {
    anzeigen.push({
      id: data[i][0],
      datum: data[i][1],
      melder: data[i][2],
      beschuldigter: data[i][3],
      tatbestand: data[i][4],
      zeugen: data[i][5],
      strafe: data[i][6],
      status: data[i][7]
    });
  }
  
  return { anzeigen: anzeigen };
}

// ============================================================
// STATISTICS
// ============================================================

function getStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Get all members
  const membersSheet = ss.getSheetByName(SHEET_MEMBERS);
  const membersData = membersSheet.getDataRange().getValues();
  const totalMembers = membersData.length - 1;
  
  // Get all events
  const eventsSheet = ss.getSheetByName(SHEET_EVENTS);
  const eventsData = eventsSheet.getDataRange().getValues();
  const totalEvents = eventsData.length - 1;
  
  // Get attendance stats
  const attendanceSheet = ss.getSheetByName(SHEET_ATTENDANCE);
  const attendanceData = attendanceSheet.getDataRange().getValues();
  
  let totalAttended = 0;
  let totalAbsent = 0;
  const memberStats = {};
  const eventStats = {};
  const absences = [];
  
  for (let i = 1; i < attendanceData.length; i++) {
    const pin = attendanceData[i][0];
    const name = attendanceData[i][1];
    const eventId = attendanceData[i][2];
    const status = attendanceData[i][3];
    const comment = attendanceData[i][4];
    
    if (!memberStats[pin]) {
      memberStats[pin] = { name: name, attended: 0, absent: 0 };
    }
    
    if (!eventStats[eventId]) {
      eventStats[eventId] = { attended: 0, absent: 0 };
    }
    
    if (status === 'anwesend') {
      totalAttended++;
      memberStats[pin].attended++;
      eventStats[eventId].attended++;
    } else {
      totalAbsent++;
      memberStats[pin].absent++;
      eventStats[eventId].absent++;
      // Add to absences list
      absences.push({
        name: name,
        eventId: eventId,
        comment: comment || ''
      });
    }
  }
  
  // Top 10 fleißigste
  const topAttenders = Object.values(memberStats)
    .sort((a, b) => b.attended - a.attended)
    .slice(0, 10);
  
  // Top 10 faulste
  const topAbsent = Object.values(memberStats)
    .sort((a, b) => b.absent - a.absent)
    .slice(0, 10);
  
  // Anzeigen count
  const anzeigeSheet = ss.getSheetByName(SHEET_ANZEIGEN);
  const anzeigeData = anzeigeSheet.getDataRange().getValues();
  const totalAnzeigen = anzeigeData.length - 1;
  
  // Convert memberStats to use name as key instead of pin
  const memberStatsByName = {};
  Object.values(memberStats).forEach(m => {
    memberStatsByName[m.name] = { attended: m.attended, absent: m.absent };
  });
  
  return {
    totalMembers: totalMembers,
    totalEvents: totalEvents,
    totalAttended: totalAttended,
    totalAbsent: totalAbsent,
    totalAnzeigen: totalAnzeigen,
    attendanceRate: totalAttended + totalAbsent > 0 
      ? Math.round(totalAttended / (totalAttended + totalAbsent) * 100) 
      : 0,
    topAttenders: topAttenders,
    topAbsent: topAbsent,
    eventStats: eventStats,
    absences: absences,
    memberStats: memberStatsByName
  };
}
