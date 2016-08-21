var letsmeet = angular.module('letsmeet', []);

letsmeet.controller('TimeBlockController', function($http) {
  var timeBlockController = this;

  var minHourLookups = {
    12: {'AM': 0, 'PM': 12},
    1: {'AM': 1, 'PM': 13},
    2: {'AM': 2, 'PM': 14},
    3: {'AM': 3, 'PM': 15},
    4: {'AM': 4, 'PM': 16},
    5: {'AM': 5, 'PM': 17},
    6: {'AM': 6, 'PM': 18},
    7: {'AM': 7, 'PM': 19},
    8: {'AM': 8, 'PM': 20},
    9: {'AM': 9, 'PM': 21},
    10: {'AM': 10, 'PM': 22},
    11: {'AM': 11, 'PM': 23}
  };
  var maxHourLookups = {
    1: {'AM': 1, 'PM': 13},
    2: {'AM': 2, 'PM': 14},
    3: {'AM': 3, 'PM': 15},
    4: {'AM': 4, 'PM': 16},
    5: {'AM': 5, 'PM': 17},
    6: {'AM': 6, 'PM': 18},
    7: {'AM': 7, 'PM': 19},
    8: {'AM': 8, 'PM': 20},
    9: {'AM': 9, 'PM': 21},
    10: {'AM': 10, 'PM': 22},
    11: {'AM': 11, 'PM': 23},
    12: {'AM': 24, 'PM': 12}
  };

  timeBlockController.errors = [];
  timeBlockController.compare = function() {
    $http({
      method: 'POST',
      url: '/compare',
      data: { user1: timeBlockController.user1,
              user2: timeBlockController.user2,
              searchLengthInMinutes: 10080, // this is one week TODO: make this variable and a more understandable option (days maybe)
              hourOfDayMin: minHourLookups[timeBlockController.hourOfDayMin][timeBlockController.hourOfDayMinAmPm],
              hourOfDayMax: maxHourLookups[timeBlockController.hourOfDayMax][timeBlockController.hourOfDayMaxAmPm],
            }
    }).then(function(response) {
      var timeBlocks = response.data;
      for (var timeBlocks_i = 0; timeBlocks_i < timeBlocks.length; timeBlocks_i++) {
        timeBlocks[timeBlocks_i] = toSpecialMomentString(timeBlocks[timeBlocks_i].start) + " - " + toSpecialMomentString(timeBlocks[timeBlocks_i].end);
      }
      timeBlockController.timeBlocks = timeBlocks;
    }).catch(function(response) {
      timeBlockController.errors.push(response.status + " " + response.statusText + " " + response.data);
    });
  };

  timeBlockController.clickTimeBlock = function(index) {
    console.log(index);
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
});
