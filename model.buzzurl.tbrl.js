// ==Taberareloo==
// {
//   "name"        : "Buzzurl",
//   "include"     : ["background"]
// }
// ==/Taberareloo==

/*
 * Unfortunately, I cann't find Official API...
 * http://labs.ecnavi.jp/developer/buzzurl/api/
 */

Models.register({
  name                : 'Buzzurl',
  ICON                : 'https://buzzurl.jp/favicon.ico',
  LINK                : 'https://buzzurl.jp/',
  LOGIN_URL           : 'https://buzzurl.jp/config/login',
  POST_URL            : 'https://buzzurl.jp/config/add/execute',
  CONFIRM_URL         : 'https://buzzurl.jp/config/add/confirm',
  RECOMMENDED_TAGS_URL: 'https://buzzurl.jp/entry/',

  check: function check(ps) {
    return /quote|link/.test(ps.type);
  },

  post: function post(ps) {
    var that = this;
    var url = ps.itemUrl;
    // via http://buzzurl.jp/config/add/#bookmarklet
    var body = ps.body ? '『' + ps.body + '』' : '';
    return this.getConfirmPage(url).addCallback(function(res){
      var doc = res.response;
      var thumbprint = doc.querySelector('[name="thumbprint"]').value;
      if (!thumbprint) {
        throw new Error(chrome.i18n.getMessage('error_notLoggedin', that.name));
      }
      return request(that.POST_URL, {
        sendContent: queryString({
          thumbprint: thumbprint,
          url       : url,
          title     : ps.item,
          comment   : joinText([body, ps.description], ' ', true),
          // if you set '4', only comment will be public.
          access    : ps.private ? '5' : '0'
        }) + that.getKeyword(ps.tags)
      });
    });
  },

  getConfirmPage: function getConfirmPage(url) {
    return request(this.CONFIRM_URL + queryString({url: url}, true), {
      responseType: 'document'
    });
  },

  getKeyword: function getKeyword(tags) {
    return '&keyword=' + tags.join('&keyword=');
  },

  getUserTags: function getUserTags(url) {
    return request(this.LINK, {
      responseType: 'document'
    }).addCallback(function(res){
      var doc = res.response;
      var userLink = doc.querySelector('#navi > p:last-child a');
      if (!userLink) {
        return [];
      }
      return request(userLink.href, {
        responseType: 'document'
      }).addCallback(function(res){
        var doc = res.response;
        return $A(doc.querySelectorAll('.keyword > a')).map(function(tag){
          return {
            name     : tag.textContent.trim(),
            frequency: 0
          };
        });
      });
    });
  },

  getRecommendedTags: function getRecommendedTags(url) {
    return request(this.RECOMMENDED_TAGS_URL + url, {
      responseType: 'document'
    }).addCallback(function(res){
      var doc = res.response;
      return $A(doc.querySelectorAll(
        '#entry_tag a:not([class="little"])'
      )).map(function(tag){
        return tag.textContent.trim();
      });
    });
  },

  getSuggestions: function getSuggestions(url) {
    var that = this;
    return new DeferredHash({
      user       : this.getUserTags(url),
      recommended: this.getRecommendedTags(url)
    }).addCallback(function(ress){
      if (!ress.user[0] || !ress.recommended[0]) {
        throw new Error(chrome.i18n.getMessage('error_notLoggedin', that.name));
      }
      return {
        tags       : ress.user[1],
        recommended: ress.recommended[1]
      };
    });
  }
});
