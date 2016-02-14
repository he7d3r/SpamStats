/**
 * Generates a page [[Special:Blankpage/SpamStats]] with statistics
 * about URLs blocked by [[MediaWiki:Spam-blacklist]]
 *
 * @author: Helder (https://github.com/he7d3r)
 * @license: CC BY-SA 3.0 <https://creativecommons.org/licenses/by-sa/3.0/>
 */
( function ( mw, $ ) {
	'use strict';

	/* Translatable strings */
	mw.messages.set( {
		'ss-title': 'Estatísticas do registro da lista negra de SPAMS',
		'ss-description': 'A tabela a seguir mostra o número de "tentativas de ' +
			'edição" em que cada URL estava presente, bem como quantos usuários ' +
			'distintos tentaram inserir um certo link, e em quantas páginas ' +
			'distintas eles seriam inseridos. Leve em conta que o MediaWiki produz mais ' +
			'de um registro para a "mesma edição" caso o usuário simplesmente ' +
			'tente salvar a edição sem remover o link (ou se não remover todas ' +
			'as ocorrências do mesmo).',
		'ss-table-caption': 'Registros por URL',
		'ss-prompt-text': 'Caso deseje filtrar a lista de registros de SPAM, ' +
			'digite o texto que deve estar presente nas URLs de interesse. ' +
			'Deixe em branco para analisar todos os registros.',
		'ss-processing': 'Verificando quais dos $1 registros anteriores a $2 contém "$3".',
		'ss-column-logs': 'Registros',
		'ss-column-users': 'Usuários',
		'ss-column-pages': 'Páginas',
		'ss-column-url': 'URL'
	} );

	var batchSize = 'max',
		api,
		searchStr = prompt( mw.msg( 'ss-prompt-text' ), 'youtu' );
	function process( urls ) {
		var keys = Object.keys( urls ),
			$table, i;
		for ( i = 0; i < keys.length; i++ ) {
			urls[ keys[ i ] ].users = Object.keys( urls[ keys[ i ] ].users ).length;
			urls[ keys[ i ] ].pages = Object.keys( urls[ keys[ i ] ].pages ).length;
		}
		keys.sort( function ( a, b ) {
			return urls[ b ].pages - urls[ a ].pages;
		} );
		$table = $( '<tbody></tbody>' )
			.append(
				$( '<tr></tr>' )
					.append(
						$( '<th>' ).text( mw.msg( 'ss-column-logs' ) ),
						$( '<th>' ).text( mw.msg( 'ss-column-users' ) ),
						$( '<th>' ).text( mw.msg( 'ss-column-pages' ) ),
						$( '<th>' ).text( mw.msg( 'ss-column-url' ) )
					)
			);
		$.each( keys, function ( i, val ) {
			$table.append(
				$( '<tr></tr>' )
					.append(
						$( '<td>' ).text( urls[ val ].hits ),
						$( '<td>' ).text( urls[ val ].users ),
						$( '<td>' ).text( urls[ val ].pages ),
						$( '<td>' ).text( val )
					)
			);
		} );
		$( '#mw-content-text' )
			.empty()
			.append(
					$( $( '<p></p>' ).text( mw.msg( 'ss-description' ) ) ),
					$( '<table class="wikitable sortable"></table>' )
						.append( $( '<caption>' ).text( mw.msg( 'ss-table-caption' ) ) )
						.append( $table )
						.tablesorter()
			);
		$( '#firstHeading' ).text( mw.msg( 'ss-title' ) );
	}
	function normalize( url ) {
		return url
			// Remove HTTP and HTTPS protocols
			.replace( /(^| )(?:https?:)?\/\//gi, '$1' );
	}
	function load() {
		var urls = {},
			param = {
				list: 'logevents',
				leprop: 'ids|timestamp|details|userid',
				letype: 'spamblacklist',
				lelimit: batchSize,
				continue: ''
			},
			getLogBatch = function ( queryContinue ) {
				$.extend( param, queryContinue );
				api.get( param )
				.done( function ( data ) {
					$( '#mw-content-text' )
						.empty()
						.append(
							$( '<p></p>' ).text(
								mw.msg(
									'ss-processing',
									data.limits.logevents,
									data.query.logevents[ 0 ].timestamp,
									searchStr
								)
							)
						);
					$.each( data.query.logevents, function ( id, val ) {
						var parts = val.params.url.split( ' ' ),
							url, i;
						for ( i = 0; i < parts.length; i++ ) {
							url = parts[ i ];
							if ( !searchStr || url.indexOf( searchStr ) !== -1 ) {
								url = normalize( url );
								if ( urls[ url ] ) {
									urls[ url ].hits++;
								} else {
									urls[ url ] = {
										hits: 1,
										users: {},
										pages: {}
									};
								}
								urls[ url ].users[ val.userid ] = true;
								urls[ url ].pages[ val.pageid ] = true;
							}
						}
					} );
					if ( data.continue ) {
						getLogBatch( data.continue );
					} else {
						process( urls );
					}
				} );
			};
		api = new mw.Api();
		getLogBatch();
	}

	if ( mw.config.get( 'wgCanonicalSpecialPageName' ) === 'Blankpage'
		&& /\/SpamStats$/.test( mw.config.get( 'wgTitle' ) )
	) {
		$.when(
			mw.loader.using( [
				'mediawiki.api',
				'jquery.tablesorter'
			] ),
			$.ready
		).then( load );
	}

}( mediaWiki, jQuery ) );
