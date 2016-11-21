/**
 *
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
APP.Main = (function () {

  var LAZY_LOAD_THRESHOLD = 300;
  var $ = document.querySelector.bind(document);

  var stories = null;
  var storyStart = 0;
  var count = 100;
  var main = $('main');
  var inDetails = false;
  var storyLoadCount = 0;
  var localeData = {
    data: {
      intl: {
        locales: 'en-US'
      }
    }
  };

  var tmplStory = $('#tmpl-story').textContent;
  var tmplStoryDetails = $('#tmpl-story-details').textContent;
  var tmplStoryDetailsComment = $('#tmpl-story-details-comment').textContent;

  if (typeof HandlebarsIntl !== 'undefined') {
    HandlebarsIntl.registerWith(Handlebars);
  } else {

    // Remove references to formatRelative, because Intl isn't supported.
    var intlRelative = /, {{ formatRelative time }}/;
    tmplStory = tmplStory.replace(intlRelative, '');
    tmplStoryDetails = tmplStoryDetails.replace(intlRelative, '');
    tmplStoryDetailsComment = tmplStoryDetailsComment.replace(intlRelative, '');
  }

  var storyTemplate =
    Handlebars.compile(tmplStory);
  var storyDetailsTemplate =
    Handlebars.compile(tmplStoryDetails);
  var storyDetailsCommentTemplate =
    Handlebars.compile(tmplStoryDetailsComment);

  /**
   * As every single story arrives in shove its
   * content in at that exact moment. Feels like something
   * that should really be handled more delicately, and
   * probably in a requestAnimationFrame callback.
   */
  function onStoryData(key, details) {

    function appendNextStory() {
      // var storyElements = document.querySelectorAll('.story');

      // This seems odd. Surely we could just select the story
      // directly rather than looping through all of them.

      // for (var i = 0; i < storyElements.length; i++) {

      // if (storyElements[i].getAttribute('id') === 's-' + key) {

      // console.log(key, details);

      details.time *= 1000;
      //OPTIMIZATION: avoid looping and use key to query for story
      var story = document.querySelector("#s-" + key);
      var html = storyTemplate(details);
      story.innerHTML = html;
      story.addEventListener('click', onStoryClick.bind(this, details));
      story.classList.add('clickable');

      // Tick down. When zero we can batch in the next load.
      storyLoadCount--;

      // console.log("key: ", key, "details: ", details, "storyLoadCount: ", storyLoadCount, "story: ", story);
      // }
      // }

      // Colorize on complete.
      if (storyLoadCount === 0)
        colorizeAndScaleStories();
    }

    requestAnimationFrame(appendNextStory);
  }

  function onStoryClick(details) {

    var storyDetails = $('sd-' + details.id);

    // Wait a little time then show the story details.
    // OPTIMIZATION: reduce timeout from 60 to 1
    setTimeout(showStory.bind(this, details.id), 1);

    // Create and append the story. A visual change...
    // perhaps that should be in a requestAnimationFrame?
    // And maybe, since they're all the same, I don't
    // need to make a new element every single time? I mean,
    // it inflates the DOM and I can only see one at once.
    if (!storyDetails) {

      if (details.url)
        details.urlobj = new URL(details.url);

      var comment;
      var commentsElement;
      var storyHeader;
      var storyContent;

      var storyDetailsHtml = storyDetailsTemplate(details);
      var kids = details.kids;
      var commentHtml = storyDetailsCommentTemplate({
        by: '',
        text: 'Loading comment...'
      });

      storyDetails = document.createElement('section');
      storyDetails.setAttribute('id', 'sd-' + details.id);
      storyDetails.classList.add('story-details');
      storyDetails.innerHTML = storyDetailsHtml;

      document.body.appendChild(storyDetails);

      commentsElement = storyDetails.querySelector('.js-comments');
      storyHeader = storyDetails.querySelector('.js-header');
      storyContent = storyDetails.querySelector('.js-content');

      var closeButton = storyDetails.querySelector('.js-close');
      closeButton.addEventListener('click', hideStory.bind(this, details.id));

      var headerHeight = storyHeader.getBoundingClientRect().height;
      storyContent.style.paddingTop = headerHeight + 'px';

      if (typeof kids === 'undefined')
        return;

      // for (var k = 0; k < 10; k++) {
      for (var k = 0; k < kids.length; k++) {

        comment = document.createElement('aside');
        comment.setAttribute('id', 'sdc-' + kids[k]);
        comment.classList.add('story-details__comment');
        comment.innerHTML = commentHtml;
        commentsElement.appendChild(comment);

        // Update the comment with the live data.
        APP.Data.getStoryComment(kids[k], function (commentDetails) {

          commentDetails.time *= 1000;

          var comment = commentsElement.querySelector(
            '#sdc-' + commentDetails.id);
          comment.innerHTML = storyDetailsCommentTemplate(
            commentDetails,
            localeData);
        });
      }
    }

  }

  function showStory(id) {

    if (inDetails)
      return;

    inDetails = true;

    var storyDetails = $('#sd-' + id);
    var left = null;

    if (!storyDetails)
      return;

    document.body.classList.add('details-active');
    storyDetails.style.opacity = 1;

    function animate() {

      // Find out where it currently is.
      var storyDetailsPosition = storyDetails.getBoundingClientRect();

      // Set the left value if we don't have one already.
      if (left === null)
        left = storyDetailsPosition.left;

      // Now figure out where it needs to go.
      left += (0 - storyDetailsPosition.left) * 0.1;

      // Set up the next bit of the animation if there is more to do.
      if (Math.abs(left) > 0.5)
      // setTimeout(animate, 4);
      // OPTIMIZATION: use requestAnimationFrame
        requestAnimationFrame(animate);
      else
        left = 0;

      // And update the styles. Wait, is this a read-write cycle?
      // I hope I don't trigger a forced synchronous layout!
      storyDetails.style.left = left + 'px';
    }

    // We want slick, right, so let's do a setTimeout
    // every few milliseconds. That's going to keep
    // it all tight. Or maybe we're doing visual changes
    // and they should be in a requestAnimationFrame
    // setTimeout(animate, 4);
    // OPTIMIZATION: use requestAnimationFrame
    requestAnimationFrame(animate);
  }

  function hideStory(id) {

    if (!inDetails)
      return;

    var storyDetails = $('#sd-' + id);
    var left = 0;

    document.body.classList.remove('details-active');
    storyDetails.style.opacity = 0;

    function animate() {

      // Find out where it currently is.
      var mainPosition = main.getBoundingClientRect();
      var storyDetailsPosition = storyDetails.getBoundingClientRect();
      var target = mainPosition.width + 100;

      // Now figure out where it needs to go.
      left += (target - storyDetailsPosition.left) * 0.1;

      // Set up the next bit of the animation if there is more to do.
      if (Math.abs(left - target) > 0.5) {
        // OPTIMIZATION: use requestAnimationFrame
        // setTimeout(animate, 4);
        requestAnimationFrame(animate);
      } else {
        left = target;
        inDetails = false;
      }

      // And update the styles. Wait, is this a read-write cycle?
      // I hope I don't trigger a forced synchronous layout!
      storyDetails.style.left = left + 'px';
    }

    // We want slick, right, so let's do a setTimeout
    // every few milliseconds. That's going to keep
    // it all tight. Or maybe we're doing visual changes
    // and they should be in a requestAnimationFrame
    requestAnimationFrame(animate);
  }

  /**
   * OPTIMIZATIONS:
   * 1) Batch all queries and update styles separately
   * 2) Only update stories that are within visible story area
   * 3) Calculate scale, saturation and opacity numerically
   */
  function colorizeAndScaleStories() {
    // OPTIMIZATION: move all constant queries outside loop
    var storyElements = document.querySelectorAll('.story');
    var storyStyles = [];
    var mainPosition = main.getBoundingClientRect(); // story area border box
    // var height = main.offsetHeight;
    // var bodyPosition = document.body.getBoundingClientRect();

    // It does seem awfully broad to change all the
    // colors every time!
    function calculateStyles() {
      // Just calculate these numerically without queries
      var saturation = 100;
      var scale = opacity = 1.0;

      for (var s = 0; s < storyElements.length; s++) {
        var story = storyElements[s];
        var score = story.querySelector('.story__score');

        // Base the scale on the y position of the score.
        var scorePosition = score.getBoundingClientRect(); // score border box
        // var scoreLocation = scorePosition.top - bodyPosition.top;
        // OPTIMIZATION: don't use queries to calculate
        // var scale = Math.min(1, 1 - (0.05 * ((scoreLocation - 170) / height)));
        // var opacity = Math.min(1, 1 - (0.5 * ((scoreLocation - 170) / height)));

        // Now figure out how wide it is and use that to saturate it.
        // OPTIMIZATION: just calculate numerically
        // var saturation = (100 * ((scorePosition.width - 38) / 2));

        // Save scale, saturation and opacity for this story
        // Save all 0's if story is not within visible area
        if (scorePosition.bottom >= mainPosition.top && scorePosition.top <= mainPosition.bottom) {
          storyStyles.push({
            'scale': scale,
            'saturation': saturation,
            'opacity': opacity
          });
          saturation -= 8;
          scale -= 0.025;
          opacity -= 0.05;
        } else {
          storyStyles.push({
            'scale': 0,
            'saturation': 0,
            'opacity': 0
          });
        }
      }
    }
    calculateStyles();

    // Only apply styles for visible stories
    // Indicated by non-zero values
    function applyStyles() {
      for (var s = 0; s < storyElements.length; s++) {
        if (storyStyles[s].opacity != 0) {
          var story = storyElements[s];
          var score = story.querySelector('.story__score');
          var title = story.querySelector('.story__title');
          score.style.width = (storyStyles[s].scale * 40) + 'px';
          score.style.height = (storyStyles[s].scale * 40) + 'px';
          score.style.lineHeight = (storyStyles[s].scale * 40) + 'px';
          score.style.backgroundColor = 'hsl(42, ' + storyStyles[s].saturation + '%, 50%)';
          title.style.opacity = storyStyles[s].opacity;
        }
      }
    }
    applyStyles();
  }

  main.addEventListener('touchstart', function (evt) {

    // I just wanted to test what happens if touchstart
    // gets canceled. Hope it doesn't block scrolling on mobiles...
    if (Math.random() > 0.97) {
      evt.preventDefault();
    }

  });

  main.addEventListener('scroll', function () {

    var header = $('header');
    var headerTitles = header.querySelector('.header__title-wrapper');
    var scrollTopCapped = Math.min(70, main.scrollTop);
    var scaleString = 'scale(' + (1 - (scrollTopCapped / 300)) + ')';

    colorizeAndScaleStories();

    header.style.height = (156 - scrollTopCapped) + 'px';
    headerTitles.style.webkitTransform = scaleString;
    headerTitles.style.transform = scaleString;

    // Add a shadow to the header.
    if (main.scrollTop > 70)
      document.body.classList.add('raised');
    else
      document.body.classList.remove('raised');

    // Check if we need to load the next batch of stories.
    var loadThreshold = (main.scrollHeight - main.offsetHeight -
      LAZY_LOAD_THRESHOLD);
    if (main.scrollTop > loadThreshold)
      loadStoryBatch(count);
  });

  // OPTIMIZATION: take batchCount as parameter to allow a small initial batch
  function loadStoryBatch(batchCount) {

    if (storyLoadCount > 0)
      return;

    storyLoadCount = batchCount;

    var end = storyStart + batchCount;
    for (var i = storyStart; i < end; i++) {

      if (i >= stories.length)
        return;

      var key = String(stories[i]);
      var story = document.createElement('div');
      story.setAttribute('id', 's-' + key);
      story.classList.add('story');
      story.innerHTML = storyTemplate({
        title: '...',
        score: '-',
        by: '...',
        time: 0
      });
      main.appendChild(story);

      APP.Data.getStoryById(stories[i], onStoryData.bind(this, key));
    }

    storyStart += batchCount;

  }

  // Bootstrap in the stories.
  APP.Data.getTopStories(function (data) {
    stories = data;
    // OPTIMIZATION: load a small initial batch
    loadStoryBatch(20);
    main.classList.remove('loading');
  });

})();
