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
      timeBlockController.timeBlocks = response.data;
    }).catch(function(response) {
      timeBlockController.errors.push(response.status + " " + response.statusText + " " + response.data);
    });
  };
});
