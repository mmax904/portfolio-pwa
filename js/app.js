var deferredPrompt;

if(!window.Promise) window.Promise = Promise;

if('serviceWorker' in navigator) {
    navigator
        .serviceWorker
        .register('/sw.js')
        .then(function () {
            console.log('sw registered!!');
        })
        .catch(function (err) {
            console.log(err);
        });
}

/**
 * To unregister the sw
 */
/**
navigator.serviceWorker.getRegistrations()
  .then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister()
  }})
*/

/**
window.addEventListener('beforeinstallprompt', function(event){
    event.preventDefault();
    deferredPrompt = event;
    return false;
});
*/