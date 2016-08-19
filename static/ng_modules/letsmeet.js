var letsmeet = angular.module('letsmeet', []);

letsmeet.controller('TimeBlockController', function($http) {
  var timeBlockController = this;
  timeBlockController.compare = function() {
    $http({
      method: 'POST',
      url: '/compare',
      data: { user1: timeBlockController.user1,
              user2: timeBlockController.user2,
              searchLengthInMinutes: 10080
            }
    }).success(function(data) {
      timeBlockController.timeBlocks = data;
    });
  };
});
