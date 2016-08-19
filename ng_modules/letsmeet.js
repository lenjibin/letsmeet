var letsmeet = angular.module('letsmeet', []);

letsmeet.controller('TimeBlockController', function() {
  var timeBlockController = this;
  // $scope.yourData = "alskdjlskjd";
  timeBlockController.compare = function() {
    timeBlockController.variable = "whatever";
    // $http({
    //   method: 'POST',
    //   url: '/compare',
    //   data: { user1: 'benjaleelin@gmail.com',
    //           user2: 'crazydogsmile@gmail.com',
    //           searchLengthInMinutes: 10080
    //         }
    // }).success(function(data, status) {
    //   $scope.yourData = data;
    // });
  };
  timeBlockController.variable = "what the";
});
