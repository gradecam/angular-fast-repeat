/* globals angular */
angular.module('gc.fastRepeat', []).directive('fastRepeat', ['$compile', '$parse', '$animate', '$rootScope', function ($compile, $parse, $animate, $rootScope) {
    'use strict';

    var fastRepeatId = 0,
        showProfilingInfo = false;

    // JSON.stringify replacer function which removes any keys that start with $$.
    // This prevents unnecessary updates when we watch a JSON stringified value.
    function JSONStripper(key, value) {
        if(key.slice && key.slice(0,2) == '$$') { return undefined; }
        return value;
    }

    function getTime() { // For profiling
        if(window.performance && window.performance.now) { return window.performance.now(); }
        else { return (new Date()).getTime(); }
    }

    return {
        restrict: 'A',
        transclude: 'element',
        priority: 1000,
        compile: function(tElement, tAttrs) {
            return function link(listScope, element, attrs, ctrl, transclude) {
                var repeatParts = attrs.fastRepeat.split(' in ');
                var repeatListName = repeatParts[1], repeatVarName = repeatParts[0];
                var getter = $parse(repeatListName); // getter(scope) should be the value of the list.
                var disableOpts = $parse(attrs.fastRepeatDisableOpts)(listScope);
                var currentRowEls = {};
                var t;

                // The rowTpl will be digested once -- want to make sure it has valid data for the first wasted digest.  Default to first row or {} if no rows
                var scope = listScope.$new();
                scope[repeatVarName] = getter(scope)[0] || {};
                scope.fastRepeatStatic = true; scope.fastRepeatDynamic = false;


                // Transclude the contents of the fast repeat.
                // This function is called for every row. It reuses the rowTpl and scope for each row.
                var rowTpl = transclude(scope, function(rowTpl, scope) {
                    $animate.enabled(false, rowTpl);
                });

                // Create an offscreen div for the template
                var tplContainer = $("<div/>");
                $('body').append(tplContainer);
                scope.$on('$destroy', function() {
                    tplContainer.detach();
                });
                tplContainer.css({position: 'absolute', top: '110%'});
                var elParent = element.parents().filter(function() { return $(this).css('display') !== 'inline'; }).first();
                tplContainer.width(elParent.width());
                tplContainer.height(elParent.height());
                tplContainer.css({visibility: 'hidden'});

                tplContainer.append(rowTpl);

                var updateList = function(rowTpl, scope, forceUpdate) {
                    function render(item) {
                        scope[repeatVarName] = item;
                        scope.$digest();
                        rowTpl.attr('fast-repeat-id', item.$$fastRepeatId);
                        return rowTpl.clone();
                    }


                    var list = getter(scope);
                    // Generate ids if necessary and arrange in a hash map
                    var listByIds = {};
                    angular.forEach(list, function(item) {
                        if(!item.$$fastRepeatId) {
                            if(item.id) { item.$$fastRepeatId = item.id; }
                            else if(item._id) { item.$$fastRepeatId = item._id; }
                            else { item.$$fastRepeatId = ++fastRepeatId; }
                        }
                        listByIds[item.$$fastRepeatId] = item;
                    });

                    // Delete removed rows
                    angular.forEach(currentRowEls, function(row, id) {
                        if(!listByIds[id]) {
                            row.el.detach();
                        }
                    });
                    // Add/rearrange all rows
                    var previousEl = element;
                    angular.forEach(list, function(item) {
                        var id = item.$$fastRepeatId;
                        var row=currentRowEls[id];


                        if(row) {
                            // We've already seen this one
                            if((!row.compiled && (forceUpdate || !angular.equals(row.copy, item))) || (row.compiled && row.item!==item)) {
                                // This item has not been compiled and it apparently has changed -- need to rerender
                                var newEl = render(item);
                                row.el.replaceWith(newEl);
                                row.el = newEl;
                                row.copy = angular.copy(item);
                                row.compiled = false;
                                row.item = item;
                            }
                        } else {
                            // This must be a new node

                            if(!disableOpts) {
                                row = {
                                    copy: angular.copy(item),
                                    item: item,
                                    el: render(item)
                                };
                            } else {
                                // Optimizations are disabled
                                row = {
                                    copy: angular.copy(item),
                                    item: item,
                                    el: $('<div/>'),
                                    compiled: true
                                };
                                
                                renderUnoptimized(item, function(newEl) {
                                    row.el.replaceWith(newEl);
                                    row.el=newEl;
                                });
                            }

                            currentRowEls[id] =  row;
                        }
                        previousEl.after(row.el.last());
                        previousEl = row.el.last();
                    });

                };


                // Here is the main watch. Testing has shown that watching the stringified list can
                // save roughly 500ms per digest in certain cases.
                // JSONStripper is used to remove the $$fastRepeatId that we attach to the objects.
                var busy=false;
                listScope.$watch(function(scp){ return JSON.stringify(getter(scp), JSONStripper); }, function(list) {
                    tplContainer.width(elParent.width());
                    tplContainer.height(elParent.height());

                    if(busy) { return; }
                    busy=true;

                    if (showProfilingInfo) {
                        t = getTime();
                    }

                    // Rendering is done in a postDigest so that we are outside of the main digest cycle.
                    // This allows us to digest the individual row scope repeatedly without major hackery.
                    listScope.$$postDigest(function() {
                        tplContainer.width(elParent.width());
                        tplContainer.height(elParent.height());
                        scope.$digest();

                        updateList(rowTpl, scope);
                        if (showProfilingInfo) {
                            t = getTime() - t;
                            console.log("Total time: ", t, "ms");
                            console.log("time per row: ", t/list.length);
                        }
                        busy=false;
                    });
                }, false);

                function renderRows() {
                    listScope.$$postDigest(function() {
                        tplContainer.width(elParent.width());
                        tplContainer.height(elParent.height());
                        scope.$digest();
                        updateList(rowTpl, scope, true);
                    });
                }
                if(attrs.fastRepeatWatch) {
                    listScope.$watch(attrs.fastRepeatWatch, renderRows);
                }
                listScope.$on('fastRepeatForceRedraw', renderRows);

                function renderUnoptimized(item, cb) {
                    var newScope = scope.$new(false);

                    newScope[repeatVarName] = item;
                    newScope.fastRepeatStatic = false; newScope.fastRepeatDynamic = true;
                    var clone = transclude(newScope, function(clone) {
                        tplContainer.append(clone);
                    });
            
                    newScope.$$postDigest(function() {
                        cb(clone);
                    });

                    newScope.$digest();

                    return newScope;
                }

                element.parent().on('click', '[fast-repeat-id]', function(evt) {
                    var $target = $(this);
                    if($target.parents().filter('[fast-repeat-id]').length) {
                        return; // This event wasn't meant for us
                    }
                    evt.stopPropagation();

                    var rowId = $target.attr('fast-repeat-id');
                    var item = currentRowEls[rowId].item;


                    // Find index of clicked dom element in list of all children element of the row.
                    // -1 would indicate the row itself was clicked.
                    var elIndex = $target.find('*').index(evt.target);
                    var newScope = renderUnoptimized(item, function(clone) {
                        $target.replaceWith(clone);

                        currentRowEls[rowId] = {
                            compiled: true,
                            el: clone,
                            item: item
                        };

                        setTimeout(function() {
                            if(elIndex >= 0) {
                                clone.find('*').eq(elIndex).trigger('click');
                            } else {
                                clone.trigger('click');
                            }
                        }, 0);
                    });

                    newScope.$digest();
                });

                // Handle resizes
                //
                var onResize = function() {
                    tplContainer.width(elParent.width());
                    tplContainer.height(elParent.height());
                };

                var jqWindow = $(window);
                jqWindow.on('resize', onResize);
                element.on('$destroy', function() { jqWindow.off('resize', onResize); });

            };
        },
    };
}]);
