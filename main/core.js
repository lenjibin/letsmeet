var google = require('googleapis');
var moment = require('moment');
var helpers = require('./helpers');

function findMutualTime(auth1, auth2, calendars1, calendars2, searchLengthInMinutes, hangoutLengthInMinutes, hourOfDayMin, hourOfDayMax, callback) {
  var TimeBlock = function(start, end) {
    this.start = start;
    this.end = end;
  };

  var CalendarEvents = function() {
    this.events = [];
    this.allDayEvents = []; // TODO: these are currently not used. in the future will want to ask to make sure none of the all day events conflict.
  }

  var calendar1Events = new CalendarEvents();
  var calendar2Events = new CalendarEvents();
  helpers.asyncLoop(calendars1.length, function(loop) {
    handleCalendar(auth1, calendars1[loop.iteration()], calendar1Events, function() { loop.next(); });
  }, function() {
    helpers.asyncLoop(calendars2.length, function(loop) {
      handleCalendar(auth2, calendars2[loop.iteration()], calendar2Events, function() { loop.next(); });
    }, function() {
      var startingTimeBlock = new TimeBlock(moment().startOf('day'), moment().add(searchLengthInMinutes, 'minutes').endOf('day'));
      var timeBlocks = applyHourOfDayMinAndMax(startingTimeBlock, hourOfDayMin, hourOfDayMax);
      timeBlocks = applyOccupiedTimeBlocks(timeBlocks, calendar1Events.events);
      timeBlocks = applyOccupiedTimeBlocks(timeBlocks, calendar2Events.events);

      timeBlocks = removeEmptyTimeBlocks(timeBlocks);
      timeBlocks = consolidatetimeBlocks(timeBlocks);
      timeBlocks = applyHangoutLength(timeBlocks, hangoutLengthInMinutes);

      callback(timeBlocks);
    });
  });

  function applyHourOfDayMinAndMax(timeBlock, hourOfDayMin, hourOfDayMax) {
    var timeBlocks = [];
    var currTime = timeBlock.start.clone();
    while(currTime < timeBlock.end) {
      timeBlocks.push(new TimeBlock(currTime.clone().hour(hourOfDayMin), currTime.clone().hour(hourOfDayMax)));
      currTime.add(1, 'days');
    }
    return timeBlocks;
  }

  function applyOccupiedTimeBlocks(timeBlocks, calendarEvents) {
    var calendarEvent = calendarEvents.shift();
    while(calendarEvent != null) {
      for (var i = 0; i < timeBlocks.length; i++) {
        timeBlocks[i] = newTimeBlocks(timeBlocks[i], new TimeBlock(moment(calendarEvent.start.dateTime), moment(calendarEvent.end.dateTime)));
      }
      timeBlocks = [].concat.apply([], timeBlocks);
      calendarEvent = calendarEvents.shift();
    }
    return timeBlocks;
  }

  function removeEmptyTimeBlocks(timeBlocks) {
    var newTimeBlocks = [];
    for (var i = 0; i < timeBlocks.length; i++) {
      var currTimeBlock = timeBlocks[i];
      if (currTimeBlock.start.isSame(currTimeBlock.end, 'minute')) {
        continue;
      }
      newTimeBlocks.push(currTimeBlock);
    }
    return newTimeBlocks;
  }

  function consolidatetimeBlocks(timeBlocks) {
    if (timeBlocks.length <= 1) {
      return timeBlocks;
    }
    var newTimeBlocks = [];
    var nextTimeBlockToBeAdded = new TimeBlock(timeBlocks[0].start, timeBlocks[0].end);
    for (var i = 0; i < timeBlocks.length; i++) {
      var currTimeBlock = timeBlocks[i];
      var currTimeBlockPlusOne = timeBlocks[i+1];
      if (currTimeBlockPlusOne) {
        if (currTimeBlock.end.isSame(currTimeBlockPlusOne.start, 'minute')) {
          nextTimeBlockToBeAdded.end = currTimeBlockPlusOne.end;
        } else {
          newTimeBlocks.push(nextTimeBlockToBeAdded);
          nextTimeBlockToBeAdded = new TimeBlock(currTimeBlockPlusOne.start, currTimeBlockPlusOne.end);
        }
      } else {
        newTimeBlocks.push(nextTimeBlockToBeAdded);
      }
    }
    return newTimeBlocks;
  }

  function applyHangoutLength(timeBlocks, hangoutLengthInMinutes) {
    if (!hangoutLengthInMinutes) {
      hangoutLengthInMinutes = 0;
    }
    var newTimeBlocks = [];
    for (var i = 0; i < timeBlocks.length; i++) {
      var currTimeBlock = timeBlocks[i];
      if (currTimeBlock.end.diff(currTimeBlock.start, 'minutes') >= hangoutLengthInMinutes) {
        newTimeBlocks.push(currTimeBlock);
      }
    }
    return newTimeBlocks;
  }

  function newTimeBlocks(originalTimeBlock, occupiedTimeBlock) {
    if (occupiedTimeBlock.start.isBefore(originalTimeBlock.start, 'minute') && occupiedTimeBlock.end.isAfter(originalTimeBlock.end, 'minute')) {
      return [];
    } else if (occupiedTimeBlock.start.isBefore(originalTimeBlock.start, 'minute') && occupiedTimeBlock.end.isAfter(originalTimeBlock.start, 'minute')) {
      return new TimeBlock(occupiedTimeBlock.end, originalTimeBlock.end);
    } else if (occupiedTimeBlock.end.isAfter(originalTimeBlock.end, 'minute') && occupiedTimeBlock.start.isBefore(originalTimeBlock.end, 'minute')) {
      return new TimeBlock(originalTimeBlock.start, occupiedTimeBlock.start);
    } else if (occupiedTimeBlock.start.isAfter(originalTimeBlock.start, 'minute') && occupiedTimeBlock.end.isBefore(originalTimeBlock.end, 'minute')) {
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

module.exports.findMutualTime = findMutualTime;
