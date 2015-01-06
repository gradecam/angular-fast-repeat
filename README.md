# angular-fast-repeat

Fast ng-repeat replacement.

## Why?

`ng-repeat` works great, but it’s slow. Like, really slow. Even relatively
simple lists are noticeably slow on modern mobile devices, and waiting for
large lists to load can be downright painful.

## Yes, but there are lots of ng-repeat replacements. Why another?

We evaluated several alternatives, but each of them required us to make
trade-offs we didn’t want to make. It’s impossible to find a perfect
replacement for the rich functionality of `ng-repeat`, and every attempt
leaves a few things out or makes some things a bit trickier.

`fast-repeat` is no different, it has its own limitations and compromises.
But sometimes, as the saying goes, better the devil you know than the devil
you don’t!

At the end of the day, we’re insatiable hackers who are learning a lot about
AngularJS internals and caveats while building solutions to our problems.
This is our third distinct implementation of an `ng-repeat` replacement, and
our goal this time around was to keep things as simple as possible, try to
keep the trade-offs reasonable, and do it in a way completely decoupled from
the rest of our code so it is totally agnostic and reusable all over.

You be the judge of how well we’ve done so far--things will inevitably change
as things shake up.

## How does it work?

For the most part, this should be a drop-in replacement for `ng-repeat`.
It does its magic by only rendering the repeat template once and then reusing
it for each row. This means, of course, that the row loses any of its dynamic
properties. Those are mostly regained with a little bit more magic: whenever
a static row is clicked, we compile a new version of the template for that row
and recreate the click.

Once a row has been clicked and recompiled in this fashion, it becomes a fully
dynamic row as if it had been created by ng-repeat. In the event that every row
has been clicked, the performance and behavior is much the same as ng-repeat.

## Is it really faster?

In all cases, initial list rendering is markedly faster than vanilla ng-repeat.
To see just how much faster, run the unit tests! Play around with the template
used in the tests to see how much benefit you can get with your own lists.

As more and more rows are interacted with and convert to standard rows that
participate in normal digest cycles, the performance benefits are slowly lost.

# Limitations and dependencies

- Rows are not dynamic until clicked.
- Row updates are only triggered by changes to the row, not external objects.
  Thus, logic such as `ng-class="{multi: list.selectedCount > 0}"` will not
  update during normal digest cycles unless the row has been clicked and thus
  made dynamic.
- **Requires jQuery** in order to utilize event delegation.
- Objects are `$watch`ed using `JSON.stringify` rather than Angular's shallow
  or deep watches. `JSON.stringify` is *much* faster on large objects than a
  deep watch, but does not test for object identity; two different objects
  that stringify identically will not look like a change. Keep this in mind.

# Example

```html
<div fast-repeat="book in books">
    {{book.title}} (<span ng-click="byAuthor(book.author)">{{book.author}}</span>)
</div>
```
