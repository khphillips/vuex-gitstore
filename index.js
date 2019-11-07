const jetpack = require('fs-jetpack');
const gitP = require('simple-git/promise');
const _git = require('simple-git')
import merge from 'deepmerge';
import GitStoreModule from './GitStoreModule'

/**
you must either start with a clone or start with an init and set the remote. 
after that you can pull just fine. 
maybe always pull if the repo exists initially on startup. (will need to happen anyways with first push)
if no repo exists, don't cretae it until the repo and remote_url are set. 
if one is set, then you will have to copy everything over to the new directory and then clone/init

directory exists?
is it a repo? 	if yes, then hopefully the remote is already set. you can then pull
				if no, then you can either init or clone into it. 
**/

export default {
	options : {},
	key : null,
	repo : null,
	root_path : null,
	store : {},
	last_push : 0,
	push_scheduled : false,

	install(options){
		this.options = this.options || {};
		this.key = options.key || null; //'entities';//this is the vuex-orm default keys
		this.root_path = options.root_path || 'gitstoreData/';

		//checks if repo exists as a folder and initializes one if not.
		//if (this.repo){
		//	if(!jetpack.exists(this.root_path + this.repo)){
		//		this.checkRepo(this.repo);
		//	}
		//}
		
		var g = this;

		//returns to vues for install
	    var f = function(store) {
	    	console.log('plugin function')
	    	g.store = store;
	    	//register our module so we can store information about the repo. 
	    	store.registerModule('gitstore', 
			  	GitStoreModule
			)

	    	g.refreshStateFromRepo()

	    	//var g = this;
	    	//subscribes to ALL changes
		    store.subscribe(function(mutation, state) {
		    	console.log('subscribe', mutation);
		    	var repo = state.gitstore.repo;
		    	if (state.gitstore.repo){
			    	//if we have a key we are looking under use that... probably gonna cause an issue with deeply nested data.
			    	if(g.key != null){
			    		var key = mutation.payload.entity;
			    		var key_state = state[g.key][mutation.payload.entity];
			    	}else{
			    		key = null;
			    		if (mutation.type.indexOf('/')){
			    			//this is a module mutation, grab the data from that namespace.
			    			key = mutation.type.split('/')[0];
			    			key_state = state[key]
			    		}else{
			    			//don't have a key, grab the data from the root of state.
			    			key = mutation.payload.entity;
			    			key_state = state[key];
			    		}
			    	}
			    	//if object is marked as "persist == false" then don't store it. 
			    	if (typeof key_state != 'undefined' && (typeof key_state.persist == 'undefined' || key_state.persist === true) ){
			    		g.setObject(key, key_state, repo);
			    	}
			    }else{
			    	console.log('no repo - no save');
			    }
		  	})
	    }
	    return f;
	},


	commitFullStateToJson(repo){
		if (repo){
	    	if(this.key != null){
	    		var state = this.store.state[this.key];
	    	}else{
	    		state = this.store.state;
	    	}
	    	console.log(repo, this.key, state)
	    	//if object is marked as "persist == false" then don't store it.
	    	for (var k in state){
	    		if (k.indexOf('$') == -1 && (typeof state[k].persist != 'undefined' || state[k].persist === true) ){
	    			console.log('setting object', k)
	    			this.setObject(k, state[k], repo);
	    		}
		    }
	    }else{
	    	console.log('no repo - no save');
	    }
	},

	//loads all files in repo and refreshes the state.
	refreshStateFromRepo(repo, overwrite){
		var key = this.key
		var store = this.store
		var g = this;
		if(repo){
			var path = this.root_path + repo;
			console.log('path', path);
			var git = _git()
    			.pull('origin', 'master', function(err, data){
    				console.log('pull complete')
		    		//grab the entired saved state from the repo
			    	//TODO: do a pull from the remote if available to get the latest. 
			    	var savedState = {};
			    	var currentState = key ? store.state[key] : store.state;
			    	var noData = true;
			    	//only update the state for items we have files for.
			    	for (var k in currentState){
			    		if (k.indexOf('$') == -1){
							var obj = g.getObject(k, repo);
			    			if (obj != null){
			    				savedState[k] = obj;
			    				noData = false;
			    			}
			    		}
			    	}
			    	//if the folder is empty then stop
			    	if(noData){
			    		return;
			    	}
			    	var new_state = savedState;
			    	if (key){
			    		new_state = {}
			    		new_state[key] = savedState
			    	}
			    	if(overwrite === true){
			    		store.replaceState({...store.state, ...new_state});
			    	}else{
			    		store.replaceState(merge(store.state, new_state, {
				        	clone: false,
						}));
			    	}
				    
		    	})
	    }
	},

	newRepo(repo, remote_url){
		var g = this;
		var path = this.root_path + repo;
		if(jetpack.exists(path)){
			return new Promise(function(resolve, reject){
				resolve("Repository folder already exists! Aborting.")
			})
		}else{
			return new Promise(function(resolve, reject){
				jetpack.dir(path);
				jetpack.write(path + '/README.md', "A Vuex-GitStore Data Repository. https://github.com/khphillips/vuex-gitstore")
				//then save the current data...
				g.commitFullStateToJson(repo);
				var git = _git(path)
					.init()
					.add('./*');
				git.commit("First commit! Initializing Data");
				console.log(remote_url)
				if(remote_url != null && remote_url != ''){
					console.log('pushing')
					git.addRemote('origin', remote_url)
						.push('origin', 'master', function(err, data){
							console.log(err)
							if (err){
								jetpack.remove(path);
							}
							resolve(err)
						})
				}else{
					resolve()
				}
			})
		}
	},


	loadRepo(repo){
		var g = this;
		var path = this.root_path + repo;
		console.log('loading', path)
		if(!jetpack.exists(path)){
			return new Promise(function(resolve, reject){
				resolve("Repository folder does not exist!")
			})
		}else{
			return new Promise(function(resolve, reject){
				g.refreshStateFromRepo(repo, true)
				resolve()
			})
		}
	},



	/**
	 * Workhorse... gets a key from the repo, parses the json and returns it. 
	 * @param  {[type]} key  [description]
	 * @param  {[type]} repo [description]
	 * @return {[type]}      [description]
	 */
	getObject(key, repo){
		console.log(key, repo)
		if (repo){
			//this.checkRepo(repo);
			var path = this.root_path + repo + '/' + key + '.json';
		}else{
			path = this.root_path + key + '.json';
		}
		console.log('getting object from ', path)
		var str = jetpack.read(path);
		if (typeof str == 'undefined'){
			return null
		}
        return JSON.parse(str);
	},

	/**
	 * Workhorse.... sets a key value pair and saves it to the repo as JSON. 
	 * Uses Async write so it doesn't hodl anythign up...
	 * TODO: if remote url is available, try pushing to remote... maybe debounce that shit. 
	 * @param {[type]} key   [description]
	 * @param {[type]} value [description]
	 * @param {[type]} repo  [description]
	 */
    setObject(key, value, repo) {
    	console.log(key, repo)
        value = JSON.stringify(value, null, 2);
        var g = this
        if (repo){
        	jetpack.writeAsync(this.root_path + repo + "/" + key + '.json', value)
        	this.commitObjects(key, repo);
        }else{
        	jetpack.writeAsync(this.root_path + key + '.json', value)
        }
    },

    /**
     * Commits the changes to the data in the repo. 
     * @param  {[type]} key  [description]
     * @param  {[type]} repo [description]
     * @return {[type]}      [description]
     */
    commitObjects(key, repo){
    	var username = this.store.state.gitstore.username ? this.store.state.gitstore.username : 'gitData'
    	var email = this.store.state.gitstore.email ? this.store.state.gitstore.email : 'gitData@gitData.com'
    	var git = _git(this.root_path + repo)
        		.addConfig('user.name', username)
    			.addConfig('user.email', email)
    			.add(key + '.json')
       			.commit("Data update: " + key);
       	if (this.store.state.gitstore.remote_url != null && this.store.state.gitstore.repo != null){
       		this.pushToRemote(this.store.state.gitstore.repo, this.store.state.gitstore.remote_url);
    	}
    },

    pushToRemote(repo, url){
    	//debounce the pushing... or we may have prollems. 
    	var now = Date.now();
    	var g = this
    	if(now - this.last_push > 5000){
    		_git(this.root_path + repo)
    		.push('origin', 'master', function(err, data){
	    		now = Date.now();
	    		g.last_push = now
	    		g.push_scheduled = false;
	    		//if err then we should handle it...
	    		if(err){
	    			g.store.state.gitstore.error.push(err)
	    		}
	    	})
	    	this.last_push = now
    	}else{
    		if (!this.push_scheduled){
    			setTimeout(function(){g.pushToRemote(repo, url)}, 5000);
    			this.push_scheduled = true;
    		}
    	}
    	
    	
    },

    pullFromRemote(repo, url){
    	console.log('pullling');
    	var g = this;	
    	var path = this.root_path + repo;
    	return new Promise(function(resolve, reject){
    		_git(this.root_path + repo)
    		.pull('origin', 'master', function(err, data){
	    		console.log('pull done!')
	    		g.refreshStateFromRepo(repo, true)
	    		resolve(err);
	    	})
    	})
    },

    cloneFromRemote(repo, url, callback){
    	var g = this;
    	var path = this.root_path + repo;
    	console.log('cloning', path);
    	if(jetpack.exists(path)){
			return new Promise(function(resolve, reject){
				resolve("Repository folder already exists! Aborting.")
			})
		}else{
			//make the directory
			jetpack.dir(path);
			return new Promise(function(resolve, reject){
				_git(g.root_path)
					.clone(url, repo, function(err, data){
			    		console.log('cloned+', err)
			    		if (err){
							jetpack.remove(path);
						}else{
							g.refreshStateFromRepo(repo, true)
						}
			    		resolve(err);
				    })
			})
		}
    }
    
}