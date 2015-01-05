/* globals jasmine, beforeEach, afterEach, describe, it, expect, module, inject, angular */
'use strict';

// Unit tests for fastRepeat directive. Note that these tests should always pass for both
// fast-repeat and ng-repeat, as they should be compatible.
describe("fastRepeat directive", function() {
    function getTime() {
        if(window.performance && window.performance.now) { return window.performance.now(); }
        else { return (new Date()).getTime(); }
    }
    var scope, elem, $compile;
    function compileWithHtml(html) {
        elem = angular.element(html);
        var compiled = $compile(elem);
        compiled(scope);
        scope.$digest();
    }
    function runAfterDigest(scope, cb) {
        scope.$$postDigest(cb);
        scope.$digest();
    }
    function compileDirective(testDir) {
        if(!testDir) { testDir = 'fast-repeat'; }
        compileWithHtml("<div><div " + testDir + "='row in list'><div class='nesting' row='{{row.val}}' ng-click=\"row.val='clicked';\">{{ row.val }}</div></div></div>");
    }

    function clickRow(idx) {
        angular.element(elem.children()[idx]).click();
    }

    beforeEach(module('gc.fastRepeat'));

    beforeEach(inject(function(_$rootScope_, _$compile_) {
        $compile = _$compile_;
        scope = _$rootScope_.$new();
    }));

    it("should be faster to render than ng-repeat with 5000 item list", function() {
        scope.list = [];
        var t1,t2,t3,t_fast,t_ng;
        for(var i=0;i<5000;i++) {
            scope.list.push({val: i});
        }
        t1=getTime();
        compileDirective();
        runAfterDigest(scope, function() {
            t2=getTime();
            t_fast = t2 - t1;
            expect(elem.children().length).toBe(scope.list.length);
            elem.html('');
            compileDirective('ng-repeat');
            runAfterDigest(scope, function() {
                t3 = getTime();
                t_ng = t3 - t2;
                expect(elem.children().length).toBe(scope.list.length);

                console.log("fast-repeat was " + Math.round(t_ng/t_fast*10)/10 + "X faster than ng-repeat.");
                expect(t_ng > t_fast).toBeTruthy();
            });
        });
    });

    it("should have the correct number of rows when initiated", function() {
        scope.list = [{val:1}, {val:2}, {val:3}, {val:4}, {val:5}];
        compileDirective();
        runAfterDigest(scope, function() {
            expect(elem.children().length).toBe(scope.list.length);
        });
    });
    it("should display the correct row values", function() {
        scope.list = [{val:1}, {val:2}, {val:3}, {val:4}, {val:5}];
        compileDirective();
        runAfterDigest(scope, function() {
            angular.forEach(scope.list, function(val, ind) {
                expect($(elem.children()[ind]).text()).toEqual(""+val.val);
            });
        });
    });
    it("should display the correct row values after the values change", function(done) {
        scope.list = [{val:1}, {val:2}, {val:3}, {val:4}, {val:5}];
        angular.forEach(scope.list, function(val) {
            val.val *= 2;
        });
        compileDirective();
        scope.$digest();
        setTimeout(function() {
            angular.forEach(scope.list, function(val, ind) {
                expect($(elem.children()[ind]).text()).toEqual(""+val.val);
            });
            done();
        },100);
    });
    it("should display the correct value after being dynamically updated with an ng-click handler that gets clicked", function(done) {
        scope.list = [{val:1}, {val:2}, {val:3}, {val:4}, {val:5}];
        compileDirective();
        var clickedRow = 1;
        elem.find("[row='2']").click();
        setTimeout(function() {
            angular.forEach(scope.list, function(val, ind) {
                var elVal = $(elem.children()[ind]).text();
                if(ind==clickedRow) { expect(elVal).toEqual("clicked"); }
                else { expect(elVal).toEqual(""+val.val); }
            });
            done();
        },100);
    });

    it("should have the correct number of rows when a row is added", function(done) {
        scope.list = [{val:1}, {val:2}, {val:3}, {val:4}, {val:5}];
        compileDirective();
        scope.list.push({val:6});
        scope.$digest();
        setTimeout(function() {
            expect(elem.children().length).toBe(scope.list.length);
            done();
        }, 100);
    });

    it("should have the correct number of rows when a row is removed", function(done) {
        scope.list = [{val:1}, {val:2}, {val:3}, {val:4}, {val:5}];
        compileDirective();
        scope.list.pop();
        scope.$digest();
        setTimeout(function() {
            expect(elem.children().length).toBe(scope.list.length);
            done();
        },100);
    });
});
