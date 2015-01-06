/* globals angular */

/**
 * @ngdoc module
 * @name gc.fastRepeat
 * @requires jQuery
 */

/**
 * @ngdoc directive
 * @name fastRepeat
 *
 * @description
 * For the most part, this should be a drop-in replacement for ng-repeat. It does its magic by only
 * rendering the repeat template once and reusing it for each row. This of course means that the row
 * loses any of its dynamic properties. Those are mostly regained with a little bit more magic:
 * whenever a static row is clicked, we compile a new version of the template for that row and
 * recreate the click.
 *
 * Once a row has been clicked and recompiled in this fashion, it becomes a fully dynamic row as if
 * it had been created by ng-repeat. In the event that every row has been clicked, the performance
 * and behavior is much the same as ng-repeat.
 *
 * In all cases, initial list rendering is markedly faster than vanilla ng-repeat. To see just how
 * much faster, run the unit tests!
 *
 * Limitations:
 * - Rows are not dynamic until clicked.
 * - Row updates are only triggered by changes to the row, not external objects. Thus, logic such
 *   as ng-class="{multi: list.selectedCount > 0}" will not update during normal digest cycles
 *   unless the row has been clicked and thus made dynamic.
 * - *Requires jQuery* to be included on the page in order to utilize event delegation with a
 *   single click listener instead of one for each row.
 * - Objects are compared using JSON.stringify rather than Angular's shallow or deep watches.
 *   JSON.stringify is *much* faster on large objects than a deep watch, but does not test for
 *   object identity -- two different objects that stringify identically will not look like a
 *   change.
 *
 * @example
 * ```html
     <div fast-repeat="book in books">
         {{book.title}} (<span ng-click="byAuthor(book.author)">{{book.author}}</span>)
     </div>
 * ```
 */
angular.module('gc.fastRepeat', []).directive('fastRepeat', ['$compile', '$parse', function ($compile, $parse) {
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
        scope: false,
        transclude: 'element',
        priority: 10000,
        compile: function(tElement, tAttrs) {
            return function link(listScope, element, attrs, ctrl, transclude) {
                var repeatParts = attrs.fastRepeat.split(' in ');
                var repeatListName = repeatParts[1], repeatVarName = repeatParts[0];
                var currentRowEls = {};
                var t;

                // Scope created for evaluating the rows -- child of the scope the list was created in.
                // Note this is almost a misnomer since the list doesn't have a scope of its own.
                var rowScope = listScope.$new(false);

                // Transclude the contents of the fast repeat.
                // This function is called for every row. It reuses the rowTpl and scope for each row.
                transclude(rowScope, function(rowTpl, scope) {
                    function render(item) {
                        scope[repeatVarName] = item;
                        scope.$digest();
                        rowTpl.attr('fast-repeat-id', item.$$fastRepeatId);
                        return rowTpl.clone();
                    }

                    var getter = $parse(repeatListName); // getter(scope) should be the value of the list.

                    // Here is the main watch. Testing has shown that watching the stringified list can
                    // save roughly 500ms per digest in certain cases.
                    // JSONStripper is used to remove the $$fastRepeatId that we attach to the objects.
                    listScope.$watch(function(scp){ return JSON.stringify(getter(scp), JSONStripper); }, function(list) {
                        list = getter(listScope);

                        if (showProfilingInfo) {
                            t = getTime();
                        }

                        // Rendering is done in a postDigest so that we are outside of the main digest cycle.
                        // This allows us to digest the individual row scope repeatedly without major hackery.
                        listScope.$$postDigest(function() {

                            // Generate ids if necessary and arrange in a hash map
                            var listByIds = {};
                            angular.forEach(list, function(item) {
                                if(!item.$$fastRepeatId) {
                                    item.$$fastRepeatId = ++fastRepeatId;
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
                                    if(!row.compiled && !angular.equals(row.copy, item)) {
                                        // This item has not been compiled and it apparently has changed -- need to rerender
                                        var newEl = render(item);
                                        row.el.replaceWith(newEl);
                                        row.el = newEl;
                                        row.copy = angular.copy(item);
                                    }
                                } else {
                                    // This must be a new node
                                    row = {
                                        copy: angular.copy(item),
                                        item: item,
                                        el: render(item)
                                    };
                                    currentRowEls[id] =  row;
                                }
                                previousEl.after(row.el.last());
                                previousEl = row.el.last();
                            });

                            if (showProfilingInfo) {
                                t = getTime() - t;
                                console.log("Total time: ", t, "ms");
                                console.log("time per row: ", t/list.length);
                            }
                        });

                    }, false);
                });
                element.parent().on('click', '[fast-repeat-id]', function(evt) {
                    var $target = $(this);
                    var rowId = $target.attr('fast-repeat-id');
                    var newScope = listScope.$new(false);
                    // Find index of clicked dom element in list of all children element of the row.
                    // -1 would indicate the row itself was clicked.
                    var elIndex = $target.find('*').index(evt.target);

                    newScope[repeatVarName] = currentRowEls[rowId].item;
                    transclude(newScope, function(clone, scope) {
                        $target.replaceWith(clone);
                        currentRowEls[rowId] = {
                            compiled: true,
                            el: clone
                        };

                        setTimeout(function() {
                            if(elIndex >= 0) {
                                clone.find('*').eq(elIndex).trigger('click');
                            } else {
                                clone.trigger('click');
                            }
                        }, 0);

                    });
                });
            };
        },
    };
}]);
