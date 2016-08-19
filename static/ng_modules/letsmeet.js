var letsmeet = angular.module('letsmeet', []);

letsmeet.controller('TimeBlockController', function($http) {
  var timeBlockController = this;
  timeBlockController.errors = [];
  timeBlockController.compare = function() {
    $http({
      method: 'POST',
      url: '/compare',
      data: { user1: timeBlockController.user1,
              user2: timeBlockController.user2,
              searchLengthInMinutes: 10080 // this is one week
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
