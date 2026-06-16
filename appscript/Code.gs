/**
 * Google Apps Script Backend for Agenda-Pro
 * This script allows you to synchronize the local storage database of Agenda-Pro with a Google Sheet.
 * 
 * To deploy this script:
 * 1. Open a Google Sheet.
 * 2. Go to Extensions -> Apps Script.
 * 3. Replace the code in Code.gs with this file.
 * 4. Click "Deploy" -> "New deployment".
 * 5. Select type "Web app".
 * 6. Set Execute as: "Me", Who has access: "Anyone".
 * 7. Copy the Web App URL and configure it in your api.js or client-side settings.
 */

function doGet(e) {
  const result = {};
  try {
    const sheetName = e.parameter.sheet || 'agendamentos';
    result.success = true;
    result.data = readSheetData(sheetName);
  } catch (error) {
    result.success = false;
    result.message = error.toString();
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const result = {};
  try {
    const postData = JSON.parse(e.postData.contents);
    const sheetName = postData.sheet;
    const action = postData.action; // 'save' or 'delete'
    const rowData = postData.data;

    if (action === 'save') {
      saveRowData(sheetName, rowData);
      result.success = true;
      result.message = "Dados salvos com sucesso!";
    } else if (action === 'delete') {
      deleteRowData(sheetName, rowData.id);
      result.success = true;
      result.message = "Dados excluídos com sucesso!";
    } else {
      result.success = false;
      result.message = "Ação inválida.";
    }
  } catch (error) {
    result.success = false;
    result.message = error.toString();
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- Helper Database Functions ---

function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Initialize headers based on sheet name
    let headers = [];
    if (name === 'clientes') {
      headers = ['id', 'name', 'phone', 'email', 'address', 'createdAt'];
    } else if (name === 'tecnicos') {
      headers = ['id', 'name', 'specialty', 'shift', 'contact'];
    } else if (name === 'equipes') {
      headers = ['id', 'name', 'techs'];
    } else if (name === 'agendamentos') {
      headers = ['id', 'clientName', 'title', 'description', 'date', 'startTime', 'endTime', 'status', 'techId', 'teamId', 'createdAt'];
    }
    if (headers.length > 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#202020').setFontColor('#ffffff');
    }
  }
  return sheet;
}

function readSheetData(sheetName) {
  const sheet = getOrCreateSheet(sheetName);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const headers = rows[0];
  const data = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const item = {};
    for (let j = 0; j < headers.length; j++) {
      let val = row[j];
      // Format dates and JSON strings if necessary
      if (headers[j] === 'techs' && typeof val === 'string') {
        try { val = JSON.parse(val); } catch(e) {}
      }
      item[headers[j]] = val;
    }
    data.push(item);
  }
  return data;
}

function saveRowData(sheetName, item) {
  const sheet = getOrCreateSheet(sheetName);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];

  let rowIndex = -1;
  // Look for existing ID
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === item.id) {
      rowIndex = i + 1; // 1-indexed and skip header
      break;
    }
  }

  // Map item object to row array matching headers
  const rowValues = headers.map(header => {
    let val = item[header];
    if (header === 'techs' && Array.isArray(val)) {
      return JSON.stringify(val);
    }
    return val !== undefined ? val : '';
  });

  if (rowIndex !== -1) {
    // Update existing
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowValues]);
  } else {
    // Append new
    sheet.appendRow(rowValues);
  }
}

function deleteRowData(sheetName, id) {
  const sheet = getOrCreateSheet(sheetName);
  const rows = sheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}
