"""Offline integration tests: synthetic graph and scripted Responses API only."""
import copy
import http.client
import json
import socket
import ssl
import urllib.error
import tempfile
import threading
import unittest
from pathlib import Path
from http.server import ThreadingHTTPServer
from unittest.mock import patch
from agent_server import AgentError, GraphTools, ask_agent, make_handler, openai_response

GRAPH = {'isDemo': True, 'generatedAt': '2026-07-31', 'nodes': [
    {'gid': '900000000000000001', 'role': 'distributor', 'priorityScore': 90, 'depth': 0},
    {'gid': '900000000000000002', 'role': 'peripheral', 'priorityScore': 10, 'depth': 4}],
    'edges': [{'id': 'e1', 'source': '900000000000000001', 'target': '900000000000000002', 'amountKzt': 5000}]}
CONFIG = {'OPENAI_API_KEY': 'test-only-not-a-real-key', 'OPENAI_MODEL': 'gpt-4.1-mini'}


def final_response(ids):
    return {'status': 'completed', 'output': [{'type': 'message', 'content': [
        {'type': 'output_text', 'text': json.dumps({'answer': 'Проверить указанные счета.', 'cited_gids': ids})}]}]}


class AgentTests(unittest.TestCase):
    def test_connection_errors_are_specific_and_do_not_leak_details(self):
        cases = [(TimeoutError('sensitive'), '30 секунд'),
                 (ssl.SSLError('sensitive'), 'защищённое соединение'),
                 (socket.gaierror('sensitive'), 'DNS'),
                 (PermissionError('sensitive'), 'Системные ограничения')]
        for reason, expected in cases:
            with self.subTest(reason=type(reason).__name__):
                with patch('agent_server.urllib.request.build_opener') as opener:
                    opener.return_value.open.side_effect = urllib.error.URLError(reason)
                    with self.assertRaises(AgentError) as caught:
                        openai_response({}, 'test-only-not-a-real-key')
                    self.assertIn(expected, str(caught.exception))
                    self.assertNotIn('sensitive', str(caught.exception))

    def test_direction_and_unknown_account(self):
        tools = GraphTools(GRAPH)
        result, _ = tools.call('get_neighbors', {'gid': GRAPH['nodes'][0]['gid'], 'direction': 'in'})
        self.assertEqual(result['total_edges'], 0)
        result, _ = tools.call('get_neighbors', {'gid': GRAPH['nodes'][1]['gid'], 'direction': 'in'})
        self.assertEqual(result['edges'][0]['source'], GRAPH['nodes'][0]['gid'])
        self.assertIn('error', tools.call('get_account', {'gid': 'missing'})[0])
        with self.assertRaises(ValueError):
            tools.call('execute_shell', {'command': 'anything'})

    def test_truncation_and_role_filter(self):
        graph = copy.deepcopy(GRAPH)
        graph['edges'] = [dict(graph['edges'][0], id=str(i), amountKzt=i) for i in range(25)]
        result, _ = GraphTools(graph).call('get_neighbors', {'gid': graph['nodes'][0]['gid'], 'direction': 'out'})
        self.assertTrue(result['truncated'])
        self.assertEqual(len(result['edges']), 20)
        self.assertEqual(result['edges'][0]['amountKzt'], 24)
        result, _ = GraphTools(graph).call('get_priority', {'role': 'peripheral'})
        self.assertEqual(len(result['accounts']), 1)

    def test_tool_loop_and_grounded_references(self):
        calls = []
        def provider(payload, key):
            calls.append(copy.deepcopy(payload))
            if len(calls) == 1:
                return {'status': 'completed', 'output': [{'type': 'function_call', 'name': 'get_priority',
                    'arguments': '{"role":"all"}', 'call_id': 'call_1'}]}
            return final_response([GRAPH['nodes'][0]['gid']])
        result = ask_agent(GRAPH, 'Кого проверить?', '', CONFIG, provider)
        self.assertEqual(len(calls), 2)
        self.assertFalse(calls[0]['store'])
        self.assertEqual(calls[1]['input'][-1]['type'], 'function_call_output')
        self.assertEqual(result['sources'], [GRAPH['nodes'][0]['gid']])
        self.assertEqual(result['trace'][0]['tool'], 'get_priority')

    def test_unverified_reference_and_no_key(self):
        with self.assertRaises(AgentError):
            ask_agent(GRAPH, '?', '', CONFIG, lambda *_: final_response(['invented']))
        with self.assertRaises(AgentError):
            ask_agent(GRAPH, '?', '', dict(CONFIG, OPENAI_API_KEY=''), lambda *_: self.fail('No network without key'))

    def test_loop_limit(self):
        count = []
        def provider(payload, key):
            count.append(1)
            return {'status': 'completed', 'output': [{'type': 'function_call', 'name': 'get_priority',
                'arguments': '{"role":"all"}', 'call_id': str(len(count))}]}
        with self.assertRaises(AgentError):
            ask_agent(GRAPH, '?', '', CONFIG, provider)
        self.assertEqual(len(count), 5)

    def test_http_consent_origin_and_secrets(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'dist').mkdir()
            (root / 'src/data').mkdir(parents=True)
            (root / 'src/data/graph_export.json').write_text(json.dumps(GRAPH))
            (root / '.env').write_text('OPENAI_API_KEY=test-only-not-a-real-key')
            provider_calls = []
            def provider(*_):
                provider_calls.append(1)
                return final_response([])
            server = ThreadingHTTPServer(('127.0.0.1', 0), make_handler(root, provider))
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            def request(method, path, body=None, extra=None):
                connection = http.client.HTTPConnection('127.0.0.1', server.server_port)
                headers = {'Content-Type': 'application/json', **(extra or {})}
                connection.request(method, path, json.dumps(body) if body is not None else None, headers)
                response = connection.getresponse()
                result = response.status, response.read().decode()
                connection.close()
                return result
            try:
                with patch.dict('os.environ', {}, clear=True):
                    status, body = request('GET', '/api/agent/status')
                    self.assertEqual(status, 200)
                    self.assertNotIn('test-only-not-a-real-key', body)
                    self.assertEqual(request('GET', '/.env')[0], 404)
                    self.assertEqual(request('POST', '/api/agent/chat', {'question': '?'})[0], 403)
                    self.assertEqual(request('POST', '/api/agent/chat', {'question': '?', 'consent': True},
                        {'Origin': 'https://other.example'})[0], 403)
                    self.assertEqual(request('POST', '/api/agent/chat', {'question': '', 'consent': True})[0], 400)
                    self.assertEqual(len(provider_calls), 0)
                    self.assertEqual(request('POST', '/api/agent/chat', {'question': '?', 'consent': True})[0], 200)
            finally:
                server.shutdown(); server.server_close(); thread.join()


if __name__ == '__main__':
    unittest.main()
