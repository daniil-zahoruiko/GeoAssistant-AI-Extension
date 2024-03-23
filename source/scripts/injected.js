const google = window.google;

console.log(google);

const oldSV = google.maps.StreetViewPanorama;
google.maps.StreetViewPanorama = Object.assign(function (...args) {
    const res = oldSV.apply(this, args);
    this.addListener('position_changed', () => console.log('position changed'));
    return res;
}, {
    prototype: Object.create(oldSV.prototype)
});