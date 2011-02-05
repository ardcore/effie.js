effie = (function() {

	var canvas,
		ctx,
		parseEffect,
		Particle;

	parseEffect = function(effect) {
		var result = { transforms: {} };
		for (var i in effect) {
			if (effect.hasOwnProperty(i)) {
				if (effect[i].indexOf && effect[i].indexOf("..") != -1) {
					result[i] = effie.utils.rangeRand.apply(null, effect[i].split(".."))
				} else {
					result[i] = effect[i];
				}
			}
		}
		return result;
	};

	// effect may be overriden by options
	Particle = function(x, y, effect, options) {

		this.toString = function() {
			return "[particle " + (effect.name || "unnamed") + "]";
		};

		var degradation, // speed modificator. can be >0 (TODO: normalize values)
			velX, velY,    // velocity vector [px/s] (TODO: check)
			sizeX, sizeY,   // size object [px]
			longevity, // how long it lives (turns)
			falldown, // scale down factor (0-1)
			color, // color of particle
			transforms,
			opacity,
			velXTrans, velYTrans,
			sizeXTrans, sizeYTrans,
			blending;


		var opt, eff; // buffers for effect data

		options = options || effect;

		opt = parseEffect(options);
		eff = parseEffect(effect);

		degradation = opt.degradation || eff.degradation || 1;
		velX = opt.velX || eff.velX || 0;
		velY = opt.velY || eff.velY || 0;

		sizeX = opt.sizeX || eff.sizeX || 1;
		sizeY = opt.sizeY || eff.sizeY || 1;

		longevity = opt.longevity || eff.longevity || Infinity;
		falldown = opt.falldown || eff.falldown || 1;
		color = opt.color || eff.color;

		this.callbackAfterDeath = opt.callbackAfterDeath || eff.callbackAfterDeath;

		velXTrans = opt.velXTrans || eff.velXTrans || function() {
			return 0
		};
		velYTrans = opt.velYTrans || eff.velYTrans || function() {
			return 0
		};
		sizeXTrans = opt.sizeXTrans || eff.sizeXTrans || function() {
			return 1
		};
		sizeYTrans = opt.sizeYTrans || eff.sizeYTrans || function() {
			return 1
		};

		blending = opt.blending || eff.blending;

		transforms = opt.transforms || eff.transforms;
		opacity = 1;

		this.isDead = false;

		this.update = function(dt, total) {
			//console.log(total);
			opacity = opacity * degradation;
			sizeX = sizeX * sizeXTrans();
			sizeY = sizeY * sizeYTrans();

			x = x + (velX * dt) + velXTrans(total);
			y = y + (velY * dt) + velYTrans(total);

			// update speed
			velX = velX * degradation;
			velY = velY * degradation;
			//debugger;

			// update size
			sizeX = sizeX * falldown;
			sizeY = sizeY * falldown;

			// update longevity
			//longevity = longevity - dt; // TODO
			longevity--;


			if (longevity < 0 || sizeX <= 0 || sizeY <= 0) {
				this.isDead = true;
			}
		};

		this.draw = function(context) {
			context.fillStyle = color;
			ctx.save();
			context.globalAlpha = opacity;

			if (blending) {
				ctx.globalCompositeOperation = blending;
			}

			context.fillRect(x, y, sizeX, sizeY);
			ctx.restore();
		}


	};

	return {
		currentEffects: [],
		ticker: {
			timer: null,
			prev_time: 0,
			current_time: 0,
			frames: 0,
			fps: 0,
			interval: 0
		},

		utils: {
			rangeRand: function(min, max) {
				return (Math.random() * (max - min) + +min);
			},

			DOMOffset: function(el) {
				var curleft, curtop;
				curleft = curtop = 0;
				if (el.offsetParent) {
					do {
						curleft += el.offsetLeft;
						curtop += el.offsetTop;
					} while (el = el.offsetParent);
				}
				return [curleft,curtop];
			},

			posInCanvas: function(pos) {
				return {
					x: pos.x - effie.data.offset.x,
					y: pos.y - effie.data.offset.y
				}
			}
		},

		data: {
			width: 0,
			height: 0,
			halfw: 0,
			halfh: 0,
			offset: {x:null,y:null},
			canvas: null,
			ctx: null
		},

		applyTo: function(el) {
			var quickDelegate, pos;
			quickDelegate = function(event, target) {
				var eventCopy = document.createEvent("MouseEvents");
				eventCopy.initMouseEvent(event.type, event.bubbles, event.cancelable, event.view, event.detail,
					event.pageX || event.layerX, event.pageY || event.layerY, event.clientX, event.clientY, event.ctrlKey, event.altKey,
					event.shiftKey, event.metaKey, event.button, event.relatedTarget);
				target.dispatchEvent(eventCopy);
				// ... and in webkit I could just dispath the same event without copying it. eh.
			};

			canvas = effie.data.canvas = el.cloneNode(false);
			ctx = effie.data.ctx = canvas.getContext("2d");

			pos = effie.utils.DOMOffset(el);

			effie.data.offset = {x:pos[0], y:pos[1]};

			effie.data.width = canvas.width = el.width;
			effie.data.height = canvas.height = el.height;
			effie.data.halfw = effie.data.width / 2;
			effie.data.halfh = effie.data.height / 2;

			canvas.style.position = "absolute";
			canvas.style.left = pos[0] + "px";
			canvas.style.top = pos[1] + "px";
			canvas.id = "effie-" + canvas.id;

			canvas.addEventListener("click", function(e) {
				quickDelegate(e, el)
			}, false);
			canvas.addEventListener("mousemove", function(e) {
				quickDelegate(e, el)
			}, false);
			canvas.addEventListener("mouseup", function(e) {
				quickDelegate(e, el)
			}, false);
			canvas.addEventListener("mousedown", function(e) {
				quickDelegate(e, el)
			}, false);

			document.body.appendChild(canvas);

			return this;


		},

		startTimer: function() {
		},

		update: function(dt, elapsedTime) {
			canvas.width = canvas.width;
			for (var i = 0; i < this.currentEffects.length; i++) {
				this.currentEffects[i].update(dt, elapsedTime);
			}
			ctx.fillStyle = "white";
			ctx.globalAlpha = 1;
			ctx.fillText(effie.ticker.fps | 0, 10, 10, 30);
		},

		createEffect: function(effectName, coords) {

			if (!effie.effects[effectName]) {
				throw "No such effect " + effectName;
			}

			var effect,
				clearMode,
				emitter,
				effectDuration;

			effectDuration = effie.effects[effectName].duration || Infinity;

			var eff = {

				particles: [],
				elapsedTime: 0,

				fpsTick: function(dt) {
					effie.ticker.current_time = +new Date();
					dt = dt || (effie.ticker.current_time - effie.ticker.prev_time) / 1000;
					eff.elapsedTime += dt;
					effie.update(dt, eff.elapsedTime);
					effie.ticker.interval += dt;
					effie.ticker.frames++;


					if (effie.ticker.interval > 1) {
						effie.ticker.fps = effie.ticker.frames / effie.ticker.interval;
						effie.ticker.interval = 0;
						effie.ticker.frames = 0;
					}

					effie.ticker.prev_time = effie.ticker.current_time;
				},

				addParticle: function() {
					if (typeof emitter == "function") {
						coords = emitter.call(effie.effects[effect]);
					} else {
						coords = emitter.concat();
					}
					eff.particles.push(new Particle(coords[0], coords[1], effie.effects[effect]));
				},


				startEffect: function() {
					effect = effectName;
					clearMode = effie.effects[effectName].clearMode;
					emitter = coords || effie.effects[effectName].emitterCoords || [effie.data.halfw, effie.data.halfh];

					var len = effie.effects[effectName].count;

					for (var i = 0; i < len; i++) {
						eff.addParticle()
					}

					if (!effie.ticker.timer) {
						effie.ticker.current_time = effie.ticker.prev_time = +new Date();
						effie.ticker.timer = setInterval(function() {
							eff.fpsTick();
						}, 15)
					}
				},

				update: function(dt, elapsedTime) {
					effectDuration -= (dt*1000);
					for (var i = 0; i < this.particles.length; i++) {
						if (!this.particles[i].isDead) {
							this.particles[i].update(dt, elapsedTime);
							this.particles[i].draw(ctx);
							//console.log(effectDuration);
						} else {
							if (effectDuration > 0 && this.particles[i].callbackAfterDeath) {
								this.particles[i].callbackAfterDeath(this);
							}
							this.particles.splice(i, 1);
						}
					}
				}
			}
			effie.currentEffects.push(eff);
			return eff;
		}
	}

})();







