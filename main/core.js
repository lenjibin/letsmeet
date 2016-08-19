var moment = require('moment');
var google = require('googleapis');
var helpers = require('./helpers');

function findMutualTime(auth1, auth2, calendars1, calendars2, searchLengthInMinutes, callback) {
  var TimeBlock = function(start, end) {
    this.start = start;
    this.end = end;
  };

  var CalendarEvents = function() {
    this.events = [];
    this.allDayEvents = []; // TODO: these are currently not used. in the future will wnat to ask to make sure none of the all day events conflict.
  }

  var calendar1Events = new CalendarEvents();
  var calendar2Events = new CalendarEvents();
  helpers.asyncLoop(calendars1.length, function(loop) {
    handleCalendar(auth1, calendars1[loop.iteration()], calendar1Events, function() { loop.next(); });
  }, function() {
    helpers.asyncLoop(calendars2.length, function(loop) {
      handleCalendar(auth2, calendars2[loop.iteration()], calendar2Events, function() { loop.next(); });
    }, function() {
      var startingTimeBlock = new TimeBlock(new Date(), new Date(new Date().getTime() + searchLengthInMinutes*60000));
      var timeBlocks = [startingTimeBlock];
      timeBlocks = applyOccupiedTimeBlocks(timeBlocks, calendar1Events.events);
      timeBlocks = applyOccupiedTimeBlocks(timeBlocks, calendar2Events.events);

      for (var timeBlocks_i = 0; timeBlocks_i < timeBlocks.length; timeBlocks_i++) {
        timeBlocks[timeBlocks_i] = toSpecialMomentString(timeBlocks[timeBlocks_i].start) + " - " + toSpecialMomentString(timeBlocks[timeBlocks_i].end);
      }

      callback(timeBlocks);
    });
  });

  function applyOccupiedTimeBlocks(timeBlocks, calendarEvents) {
    var calendarEvent = calendarEvents.shift();
    while(calendarEvent != null) {
      for (var i = 0; i < timeBlocks.length; i++) {
        timeBlocks[i] = newTimeBlocks(timeBlocks[i], new TimeBlock(new Date(calendarEvent.start.dateTime), new Date(calendarEvent.end.dateTime)));
      }
      timeBlocks = [].concat.apply([], timeBlocks);
      calendarEvent = calendarEvents.shift();
    }
    return timeBlocks;
  }

  function newTimeBlocks(originalTimeBlock, occupiedTimeBlock) {
    if (occupiedTimeBlock.start < originalTimeBlock.start && occupiedTimeBlock.end > originalTimeBlock.start) {
      return new TimeBlock(occupiedTimeBlock.end, originalTimeBlock.end);
    } else if (occupiedTimeBlock.end > originalTimeBlock.end && occupiedTimeBlock.start < originalTimeBlock.end) {
      return new TimeBlock(originalTimeBlock.start, occupiedTimeBlock.start);
    } else if (occupiedTimeBlock.start > originalTimeBlock.start && occupiedTimeBlock.end < originalTimeBlock.end) {
      return [new TimeBlock(originalTimeBlock.start, occupiedTimeBlock.start), new TimeBlock(occupiedTimeBlock.end, originalTimeBlock.end)];
    } else {
      return originalTimeBlock;
    }
  }

  function handleCalendar(auth, calendar, calendarEvents, callback) {
    var googleCalendarApi = google.calendar('v3');
    if (calendar.id.indexOf('#') == -1) {
      googleCalendarApi.events.list({
        auth: auth,
        calendarId: calendar.id,
        timeMin: new Date().toISOString(),
        timeMax: new Date(new Date().getTime() + searchLengthInMinutes*60000).toISOString(),
        timeZone: 'Atlantic/Reykjavik',
        singleEvents: true,
        orderBy: 'startTime'
      }, function(err, response) {
        if (err) {
          console.log('Events List API returned an error: ' + err);
          callback();
        }
        var events = response.items;
        for (var i = 0; i < events.length; i++) {
          var event = events[i];
          if (event.start.dateTime == null) {
            calendarEvents.allDayEvents.push(event);
          } else {
            calendarEvents.events.push(event);
          }
        }
        callback();
      });
    } else {
      callback();
    }
  }
}

function toSpecialMomentString(dateTimeStr) {
  var result = moment(dateTimeStr);
  var calendar = result.calendar();
  if (calendar.indexOf("/") != -1) {
    return result.format('MMM Do, h:mm a')
  } else {
    return result.calendar();
  }
}

// TODO: write functions that :
// TODO: remove blocks of time that are not within hourOfDayMin and hourOfDayMax
// TODO: check which time blocks are longer than hangoutLength

module.exports.findMutualTime = findMutualTime;
